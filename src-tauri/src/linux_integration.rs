//! Per-user install/upgrade lifecycle. The GUI and installer CLI share this code.
use gio::prelude::*;
use serde::{Deserialize, Serialize};
use std::{
    fs,
    io::Write,
    path::{Path, PathBuf},
    process::Command,
    sync::{
        atomic::{AtomicU64, Ordering},
        Mutex,
    },
};

const DESKTOP_ID: &str = "SlayDown.desktop";
const MIME_TYPES: [&str; 2] = ["text/markdown", "text/x-markdown"];
static LOCK: Mutex<()> = Mutex::new(());
static NEXT: AtomicU64 = AtomicU64::new(0);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Status {
    default_reader: bool,
    preview_enabled: bool,
    preview_ready: bool,
    message: String,
    install_command: Option<String>,
}

#[derive(Serialize, Deserialize)]
struct Preferences {
    preview_enabled: bool,
}

fn data_dir() -> Result<PathBuf, String> {
    let value = std::env::var_os("XDG_DATA_HOME")
        .filter(|v| !v.is_empty())
        .map(PathBuf::from)
        .or_else(|| std::env::var_os("HOME").map(|h| PathBuf::from(h).join(".local/share")))
        .ok_or("Your Linux home directory could not be found.")?;
    if !value.is_absolute() {
        return Err("XDG_DATA_HOME must be an absolute path.".into());
    }
    Ok(value)
}

fn executable() -> Result<PathBuf, String> {
    // current_exe() is inside a temporary mount when running an AppImage.
    let path = std::env::var_os("APPIMAGE")
        .filter(|v| !v.is_empty())
        .map(PathBuf::from)
        .map(Ok)
        .unwrap_or_else(std::env::current_exe)
        .map_err(|e| e.to_string())?;
    let path = path
        .canonicalize()
        .map_err(|e| format!("SlayDown's installed executable could not be located: {e}"))?;
    if !path.is_file() {
        return Err("SlayDown's installed executable is not a file.".into());
    }
    Ok(path)
}

fn exec_quote(path: &Path) -> Result<String, String> {
    let value = path.to_str().ok_or("The application path must be UTF-8.")?;
    if value.chars().any(char::is_control) {
        return Err("Move SlayDown to a path without control characters.".into());
    }
    let mut escaped = String::from("\"");
    for c in value.chars() {
        match c {
            '\\' => escaped.push_str("\\\\\\\\"),
            '"' | '`' | '$' => {
                escaped.push_str("\\\\");
                escaped.push(c);
            }
            '%' => escaped.push_str("%%"),
            _ => escaped.push(c),
        }
    }
    escaped.push('"');
    Ok(escaped)
}

fn write_changed(path: &Path, bytes: &[u8]) -> Result<bool, String> {
    if fs::read(path).ok().as_deref() == Some(bytes) {
        return Ok(false);
    }
    fs::create_dir_all(path.parent().ok_or("Invalid installation path.")?)
        .map_err(|e| e.to_string())?;
    let temp = path.with_extension(format!(
        "slaydown-{}-{}.tmp",
        std::process::id(),
        NEXT.fetch_add(1, Ordering::Relaxed)
    ));
    let result = (|| -> std::io::Result<()> {
        let mut file = fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temp)?;
        file.write_all(bytes)?;
        file.sync_all()?;
        fs::rename(&temp, path)
    })();
    if result.is_err() {
        let _ = fs::remove_file(&temp);
    }
    result.map_err(|e| e.to_string())?;
    Ok(true)
}

fn host_command(name: &str) -> Command {
    let mut command = Command::new(name);
    // Host GJS/package tools must not load libraries from an AppImage mount.
    if std::env::var_os("APPIMAGE").is_some() {
        for key in [
            "LD_LIBRARY_PATH",
            "LD_PRELOAD",
            "GIO_MODULE_DIR",
            "GI_TYPELIB_PATH",
            "GSETTINGS_SCHEMA_DIR",
            "GTK_PATH",
        ] {
            command.env_remove(key);
        }
    }
    command
}

fn output(name: &str, args: &[&str]) -> Option<String> {
    let result = host_command(name).args(args).output().ok()?;
    result
        .status
        .success()
        .then(|| String::from_utf8_lossy(&result.stdout).trim().to_owned())
}

fn is_ours(app: &gio::AppInfo) -> bool {
    let id = app.id().map(|v| v.to_string()).unwrap_or_default();
    if id == DESKTOP_ID {
        return true;
    }
    // Require both a known desktop ID and display name, rather than taking
    // over a different program just because its executable contains "folio".
    owned_id(&id) && matches!(app.display_name().as_str(), "Folio" | "SlayDown")
}

fn owned_id(id: &str) -> bool {
    [DESKTOP_ID, "Folio.desktop", "folio.desktop"].contains(&id)
        || (id.starts_with("appimagekit_")
            && (id.ends_with("-Folio.desktop") || id.ends_with("-SlayDown.desktop")))
}

fn config_home() -> Option<PathBuf> {
    std::env::var_os("XDG_CONFIG_HOME")
        .filter(|v| !v.is_empty())
        .map(PathBuf::from)
        .or_else(|| std::env::var_os("HOME").map(|h| PathBuf::from(h).join(".config")))
}

fn desktop_defaults_files() -> Vec<String> {
    std::env::var("XDG_CURRENT_DESKTOP")
        .unwrap_or_default()
        .split(':')
        .filter(|s| {
            !s.is_empty()
                && s.chars()
                    .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
        })
        .map(|d| format!("{}-mimeapps.list", d.to_ascii_lowercase()))
        .collect()
}

fn update_desktop_override(mime: &str) -> Result<(), String> {
    // GIO writes generic mimeapps.list. A user desktop-specific file has
    // higher precedence, so update its first applicable entry as well.
    let config = config_home().ok_or("Your Linux configuration directory could not be found.")?;
    for name in desktop_defaults_files() {
        let file = config.join(name);
        if !file.exists() {
            continue;
        }
        let keys = gio::glib::KeyFile::new();
        keys.load_from_file(
            &file,
            gio::glib::KeyFileFlags::KEEP_COMMENTS | gio::glib::KeyFileFlags::KEEP_TRANSLATIONS,
        )
        .map_err(|e| format!("{} could not be read: {e}", file.display()))?;
        if keys.has_key("Default Applications", mime).unwrap_or(false) {
            keys.set_string("Default Applications", mime, &format!("{DESKTOP_ID};"));
            write_changed(&file, keys.to_data().as_bytes())?;
            break;
        }
    }
    Ok(())
}

fn configured_default(data: &Path, mime: &str) -> Option<String> {
    // GIO skips a default whose executable was deleted. Preserve explicit
    // choices, but migrate an obsolete Folio ID even when its binary is gone.
    let mut dirs = vec![config_home()?];
    dirs.extend(std::env::split_paths(
        &std::env::var_os("XDG_CONFIG_DIRS").unwrap_or_else(|| "/etc/xdg".into()),
    ));
    dirs.push(data.join("applications"));
    dirs.extend(
        std::env::split_paths(
            &std::env::var_os("XDG_DATA_DIRS")
                .unwrap_or_else(|| "/usr/local/share:/usr/share".into()),
        )
        .map(|d| d.join("applications")),
    );
    let mut files = desktop_defaults_files();
    files.push("mimeapps.list".into());
    for dir in dirs {
        for name in &files {
            let Ok(text) = fs::read_to_string(dir.join(name)) else {
                continue;
            };
            let mut defaults = false;
            for line in text.lines().map(str::trim) {
                if line.starts_with('[') {
                    defaults = line == "[Default Applications]";
                }
                if defaults {
                    if let Some((key, value)) = line.split_once('=') {
                        if key.trim() == mime {
                            if let Some(id) =
                                value.split(';').map(str::trim).find(|s| !s.is_empty())
                            {
                                return Some(id.to_owned());
                            }
                        }
                    }
                }
            }
        }
    }
    None
}

fn register(data: &Path, binary: &Path, make_default: bool) -> Result<bool, String> {
    // Snapshot each type before registering; preserve every unrelated editor.
    let migrate: Vec<bool> = MIME_TYPES
        .iter()
        .map(|mime| {
            make_default
                || configured_default(data, mime)
                    .map(|id| owned_id(&id))
                    .unwrap_or_else(|| {
                        gio::AppInfo::default_for_type(mime, false)
                            .as_ref()
                            .is_some_and(is_ours)
                    })
        })
        .collect();
    let applications = data.join("applications");
    let icon = data.join("slaydown/icon.png");
    write_changed(&icon, include_bytes!("../icons/128x128.png"))?;
    let icon_value = icon
        .to_str()
        .ok_or("The application path must be UTF-8.")?
        .replace('\\', "\\\\")
        .replace('\n', "\\n")
        .replace('\r', "\\r");
    // env avoids GIO's pre-expansion existence check on %% in an executable path.
    let desktop = format!("[Desktop Entry]\nType=Application\nName=SlayDown\nComment=A beautiful, lightweight Markdown reader\nExec=/usr/bin/env -- {} %f\nIcon={}\nTerminal=false\nCategories=Office;\nStartupWMClass=slaydown\nMimeType=text/markdown;text/x-markdown;\n", exec_quote(binary)?, icon_value);
    let path = applications.join(DESKTOP_ID);
    if write_changed(&path, desktop.as_bytes())? {
        // Optional cache refresh; GIO also reads the new entry directly.
        let _ = host_command("update-desktop-database")
            .arg(&applications)
            .output();
    }
    let app = gio::DesktopAppInfo::from_filename(&path)
        .ok_or("Linux could not load the SlayDown launcher.")?;
    for (mime, should_migrate) in MIME_TYPES.iter().zip(migrate) {
        if should_migrate {
            update_desktop_override(mime)?;
            app.set_as_default_for_type(mime)
                .map_err(|e| e.to_string())?;
        }
    }
    Ok(MIME_TYPES.iter().all(|mime| {
        gio::AppInfo::default_for_type(mime, false)
            .is_some_and(|app| app.id().as_deref() == Some(DESKTOP_ID))
    }))
}

fn sushi_major() -> Option<u32> {
    let version = output("pacman", &["-Q", "sushi"])
        .and_then(|s| s.split_whitespace().nth(1).map(str::to_owned))
        .or_else(|| output("dpkg-query", &["-W", "-f=${Version}", "gnome-sushi"]))?;
    version.rsplit(':').next()?.split('.').next()?.parse().ok()
}

fn remove_adapter(data: &Path, folder: &str) -> Result<(), String> {
    let file = data.join("sushi").join(folder).join("slaydown.js");
    match fs::remove_file(file) {
        Ok(()) => Ok(()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

pub fn setup(
    resources: &Path,
    make_default: bool,
    enabled: Option<bool>,
) -> Result<Status, String> {
    let _guard = LOCK.lock().map_err(|_| "Linux setup is busy.")?;
    let data = data_dir()?;
    let binary = executable()?;
    let preferences = data.join("slaydown/integration.json");
    let mut prefs = match fs::read(&preferences) {
        Ok(bytes) => serde_json::from_slice::<Preferences>(&bytes)
            .map_err(|e| format!("Linux integration preferences could not be read: {e}"))?,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Preferences {
            preview_enabled: true,
        },
        Err(e) => return Err(e.to_string()),
    };
    if let Some(value) = enabled {
        prefs.preview_enabled = value;
    }
    write_changed(
        &preferences,
        &serde_json::to_vec(&prefs).map_err(|e| e.to_string())?,
    )?;
    let default_reader = register(&data, &binary, make_default)?;
    let mut status = Status {
        default_reader,
        preview_enabled: prefs.preview_enabled,
        preview_ready: false,
        message: String::new(),
        install_command: None,
    };
    if !prefs.preview_enabled {
        remove_adapter(&data, "viewers")?;
        remove_adapter(&data, "plugins-1")?;
        status.message =
            "Space-bar preview is off. Restart Files/Sushi if a preview is already running.".into();
        return Ok(status);
    }
    let arch = Path::new("/etc/arch-release").exists();
    let debian = Path::new("/etc/debian_version").exists();
    let dependency_command = |modern: bool| -> Option<String> {
        if arch {
            Some(format!(
                "sudo pacman -S --needed sushi gjs {}",
                if modern {
                    "webkitgtk-6.0"
                } else {
                    "webkit2gtk-4.1"
                }
            ))
        } else if debian {
            Some(format!(
                "sudo apt install gnome-sushi gjs {}",
                if modern {
                    "gir1.2-webkit-6.0"
                } else {
                    "gir1.2-webkit2-4.1"
                }
            ))
        } else {
            None
        }
    };
    let major = match sushi_major() {
        Some(major) if major >= 46 => major,
        Some(major) => {
            status.message = format!("Sushi {major} is too old for this preview. Sushi 46 or newer is required; upgrade your distribution's Sushi package, then choose Check again.");
            return Ok(status);
        }
        _ => {
            status.message =
                "Space-bar preview needs Sushi 46 or newer. Install it, then choose Check again."
                    .into();
            status.install_command = if arch {
                Some("sudo pacman -S --needed sushi gjs".into())
            } else if debian {
                Some("sudo apt install gnome-sushi gjs".into())
            } else {
                None
            };
            return Ok(status);
        }
    };
    let (folder, other, source, check) = if major >= 51 {
        (
            "plugins-1",
            "viewers",
            "sushi-modern.js",
            "imports.gi.versions.WebKit='6.0'; imports.gi.WebKit;",
        )
    } else {
        (
            "viewers",
            "plugins-1",
            "sushi-legacy.js",
            "imports.gi.versions.WebKit2='4.1'; imports.gi.WebKit2;",
        )
    };
    if output("gjs", &["-c", check]).is_none() {
        status.message = "Sushi's WebKit renderer is missing. Install the matching dependencies, then choose Check again.".into();
        status.install_command = dependency_command(major >= 51);
        return Ok(status);
    }
    let template = fs::read_to_string(resources.join("linux-preview").join(source))
        .map_err(|e| format!("The bundled Sushi adapter is missing. Reinstall SlayDown: {e}"))?;
    let script = template.replace(
        "'@@SLAYDOWN_BINARY@@'",
        &serde_json::to_string(&binary).map_err(|e| e.to_string())?,
    );
    if script.contains("@@SLAYDOWN_BINARY@@") || script.contains("@@BRIDGE@@") {
        return Err("The bundled Sushi adapter is incomplete. Reinstall SlayDown.".into());
    }
    let changed = write_changed(
        &data.join("sushi").join(folder).join("slaydown.js"),
        script.as_bytes(),
    )?;
    remove_adapter(&data, other)?;
    status.preview_ready = true;
    status.message = if changed { "Space-bar preview installed. Log out and back in to restart Sushi, then select a Markdown file in Files and press Space." }
        else { "Space-bar preview is ready in Files (Nautilus). Select a Markdown file and press Space." }.into();
    Ok(status)
}

pub fn run_cli(context: &tauri::Context<tauri::Wry>) -> bool {
    let args: Vec<String> = std::env::args().skip(1).collect();
    if args.first().map(String::as_str) != Some("--linux-integrate") {
        return false;
    }
    let result = (|| {
        if args.iter().skip(1).any(|s| {
            !["--set-default", "--enable-preview", "--disable-preview"].contains(&s.as_str())
        }) || (args.contains(&"--enable-preview".into())
            && args.contains(&"--disable-preview".into()))
        {
            return Err("Invalid Linux integration option.".into());
        }
        let resources =
            tauri::utils::platform::resource_dir(context.package_info(), &Default::default())
                .map_err(|e| e.to_string())?;
        let enabled = if args.contains(&"--enable-preview".into()) {
            Some(true)
        } else if args.contains(&"--disable-preview".into()) {
            Some(false)
        } else {
            None
        };
        setup(&resources, args.contains(&"--set-default".into()), enabled)
    })();
    match result {
        Ok(status) => println!(
            "{}",
            serde_json::to_string(&status).expect("Serializable status")
        ),
        Err(error) => {
            eprintln!("{error}");
            std::process::exit(1);
        }
    }
    true
}
