mod appearance;
mod preview;
mod documents;
mod editor;
#[cfg(desktop)]
mod menu;
mod watcher;

use documents::{is_markdown, Document, DocumentStore};
use std::{
    path::{Path, PathBuf},
    sync::Mutex,
};
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;

type Store = Mutex<DocumentStore>;
const STORE_ERROR: &str = "The document session could not be accessed. Please reopen SlayDown.";

fn read_into_session(app: &AppHandle, path: &Path) -> Result<Document, String> {
    app.state::<Store>()
        .lock()
        .map_err(|_| STORE_ERROR.to_owned())?
        .open(path)
}

#[tauri::command]
async fn open_document(app: AppHandle) -> Result<Option<Document>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let selected = app
            .dialog()
            .file()
            .set_title("Open a Markdown document")
            .add_filter("Markdown", &["md", "markdown", "mdown", "mkd"])
            .blocking_pick_file();
        selected
            .map(|file| {
                let path = file
                    .into_path()
                    .map_err(|_| "Choose a local Markdown document.".to_owned())?;
                read_into_session(&app, &path)
            })
            .transpose()
    })
    .await
    .map_err(|_| "The file picker could not finish. Please try again.".to_owned())?
}

#[tauri::command]
async fn open_in_editor(app: AppHandle, path: String) -> Result<editor::EditorInfo, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let canonical = app
            .state::<Store>()
            .lock()
            .map_err(|_| STORE_ERROR.to_owned())?
            .authorized_path(Path::new(&path))?;
        editor::launch_editor(&app, &canonical)
    })
    .await
    .map_err(|_| "The editor could not be opened. Please try again.".to_owned())?
}

#[tauri::command]
fn watch_document(app: AppHandle, path: Option<String>) -> Result<(), String> {
    let canonical = path
        .map(|path| {
            app.state::<Store>()
                .lock()
                .map_err(|_| STORE_ERROR.to_owned())?
                .authorized_path(Path::new(&path))
        })
        .transpose()?;
    app.state::<watcher::WatchState>().replace(&app, canonical)
}

// Used when the user drops a local document onto the window. This is deliberately
// a read-only, Markdown-only operation; editing can be added as a separate API.
#[tauri::command]
async fn open_path(app: AppHandle, path: String) -> Result<Document, String> {
    tauri::async_runtime::spawn_blocking(move || read_into_session(&app, Path::new(&path)))
        .await
        .map_err(|_| "The document could not be opened. Please try again.".to_owned())?
}

#[tauri::command]
fn get_initial_document(store: State<'_, Store>) -> Result<Option<Document>, String> {
    store.lock().map_err(|_| STORE_ERROR.to_owned())?.initial()
}

#[tauri::command]
fn close_document(store: State<'_, Store>, path: String) -> Result<(), String> {
    store
        .lock()
        .map_err(|_| STORE_ERROR.to_owned())?
        .close(Path::new(&path));
    Ok(())
}

#[tauri::command]
async fn reload_document(app: AppHandle, path: String) -> Result<Document, String> {
    tauri::async_runtime::spawn_blocking(move || {
        app.state::<Store>()
            .lock()
            .map_err(|_| STORE_ERROR.to_owned())?
            .reload(Path::new(&path))
    })
    .await
    .map_err(|_| "The document could not be reloaded. Please try again.".to_owned())?
}

#[tauri::command]
async fn read_image(
    app: AppHandle,
    document_path: String,
    relative_path: String,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        app.state::<Store>()
            .lock()
            .map_err(|_| STORE_ERROR.to_owned())?
            .read_image(Path::new(&document_path), &relative_path)
    })
    .await
    .map_err(|_| "The image could not be loaded.".to_owned())?
}

fn external_url(value: &str) -> Result<url::Url, String> {
    if value.len() > 8192 || value.chars().any(char::is_control) {
        return Err("This link is not a valid web or email address.".to_owned());
    }
    let url = url::Url::parse(value)
        .map_err(|_| "This link is not a valid web or email address.".to_owned())?;
    match url.scheme() {
        "http" | "https" if url.host_str().is_some() => Ok(url),
        "mailto" if !url.path().is_empty() => Ok(url),
        _ => Err("Only http, https, and email links can be opened.".to_owned()),
    }
}

#[tauri::command]
fn open_link(app: AppHandle, url: String) -> Result<(), String> {
    let url = external_url(&url)?;
    app.opener()
        .open_url(url.to_string(), None::<&str>)
        .map_err(|error| format!("This link could not be opened: {error}"))
}

fn focus_reader(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn publish_open(app: &AppHandle, path: &Path) {
    match read_into_session(app, path) {
        Ok(document) => {
            let _ = app.emit("document-opened", document);
        }
        Err(error) => {
            if let Ok(mut store) = app.state::<Store>().lock() {
                store.record_error(error.clone());
            }
            let _ = app.emit("document-error", error);
        }
    }
    focus_reader(app);
}

fn argument_path(arguments: impl Iterator<Item = String>, cwd: &Path) -> Option<PathBuf> {
    arguments
        .filter(|argument| !argument.starts_with('-'))
        .find_map(|argument| {
            let path = if argument.starts_with("file:") {
                url::Url::parse(&argument).ok()?.to_file_path().ok()?
            } else {
                PathBuf::from(argument)
            };
            if is_markdown(&path) {
                Some(if path.is_absolute() {
                    path
                } else {
                    cwd.join(path)
                })
            } else {
                None
            }
        })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    if preview::run_cli() { return; }
    let builder = tauri::Builder::default()
        .manage(Store::default())
        .manage(watcher::WatchState::default());

    // Register first, as required by the single-instance plugin. New launches
    // forward paths on Windows/Linux; macOS also sends native Opened events.
    #[cfg(desktop)]
    let builder = builder.plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
        if let Some(path) = argument_path(args.into_iter().skip(1), Path::new(&cwd)) {
            publish_open(app, &path);
        } else {
            focus_reader(app);
        }
    }));

    let app = builder
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_opener::Builder::new()
                .open_js_links_on_click(false)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            open_document,
            open_path,
            get_initial_document,
            close_document,
            reload_document,
            read_image,
            open_link,
            open_in_editor,
            editor::get_editor,
            editor::choose_editor,
            watch_document,
            appearance::get_appearance,
            appearance::set_appearance
        ])
        .setup(|app| {
            #[cfg(desktop)]
            menu::install(app.handle())?;
            let cwd = std::env::current_dir().unwrap_or_default();
            if let Some(path) = argument_path(std::env::args().skip(1), &cwd) {
                // Store it before the webview subscribes so no startup event is lost.
                publish_open(app.handle(), &path);
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("SlayDown could not start");

    app.run(|app, event| {
        #[cfg(target_os = "macos")]
        if let tauri::RunEvent::Opened { urls } = event {
            if let Some(path) = urls
                .into_iter()
                .filter_map(|url| url.to_file_path().ok())
                .next()
            {
                publish_open(app, &path);
            }
        }
        #[cfg(not(target_os = "macos"))]
        let _ = (app, event);
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn external_links_never_launch_local_files_or_custom_protocols() {
        for value in [
            "https://example.com",
            "http://localhost:8000/page",
            "mailto:hello@example.com",
        ] {
            assert!(external_url(value).is_ok());
        }
        for value in [
            "file:///etc/passwd",
            "javascript:alert(1)",
            "data:text/html,hi",
            "smb://host/share",
            "vscode://file/path",
            "mailto:",
            "https://example.com\n",
        ] {
            assert!(external_url(value).is_err(), "allowed {value}");
        }
    }

    #[test]
    fn arguments_resolve_relative_paths_and_ignore_launcher_flags() {
        let args = vec!["-psn_0_123".to_owned(), "notes.MD".to_owned()];
        assert_eq!(
            argument_path(args.into_iter(), Path::new("/workspace")),
            Some(PathBuf::from("/workspace/notes.MD"))
        );
        assert!(argument_path(
            vec!["--help".to_owned()].into_iter(),
            Path::new("/workspace")
        )
        .is_none());
    }
}
