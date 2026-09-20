use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem as Item, Submenu},
    AppHandle, Emitter, Manager,
};

pub fn install(app: &AppHandle) -> tauri::Result<()> {
    if let Ok(settings) = crate::appearance::config_dir()
        .and_then(|dir| crate::appearance::load(&dir, crate::appearance::is_omarchy()))
    {
        let _ = crate::appearance::sync_native_theme(app, &settings);
    }
    // Own the document shortcuts: the default macOS menu maps Cmd+W to
    // closing the whole window before the webview can handle it.
    let menu = Menu::with_items(
        app,
        &[
            #[cfg(target_os = "macos")]
            &Submenu::with_items(
                app,
                "SlayDown",
                true,
                &[
                    &Item::about(app, None, None)?,
                    &Item::separator(app)?,
                    &Item::services(app, None)?,
                    &Item::separator(app)?,
                    &Item::hide(app, None)?,
                    &Item::hide_others(app, None)?,
                    &Item::separator(app)?,
                    &Item::quit(app, None)?,
                ],
            )?,
            &Submenu::with_items(
                app,
                "File",
                true,
                &[
                    &MenuItem::with_id(app, "open-document", "Open…", true, Some("CmdOrCtrl+O"))?,
                    &MenuItem::with_id(
                        app,
                        "close-document",
                        "Close Document",
                        true,
                        Some("CmdOrCtrl+W"),
                    )?,
                    &Item::separator(app)?,
                    &MenuItem::with_id(
                        app,
                        "close-window",
                        "Close Window",
                        true,
                        Some("CmdOrCtrl+Shift+W"),
                    )?,
                    #[cfg(not(target_os = "macos"))]
                    &Item::quit(app, None)?,
                ],
            )?,
            &Submenu::with_items(
                app,
                "Edit",
                true,
                &[
                    &Item::undo(app, None)?,
                    &Item::redo(app, None)?,
                    &Item::separator(app)?,
                    &Item::cut(app, None)?,
                    &Item::copy(app, None)?,
                    &Item::paste(app, None)?,
                    &Item::select_all(app, None)?,
                ],
            )?,
            #[cfg(target_os = "macos")]
            &Submenu::with_items(app, "View", true, &[&Item::fullscreen(app, None)?])?,
            &Submenu::with_items(
                app,
                "Window",
                true,
                &[&Item::minimize(app, None)?, &Item::maximize(app, None)?],
            )?,
        ],
    )?;
    app.set_menu(menu)?;
    app.on_menu_event(|app, event| match event.id().as_ref() {
        "open-document" => {
            let _ = app.emit_to("main", "document-open-requested", ());
        }
        "close-document" => {
            let _ = app.emit_to("main", "document-close-requested", ());
        }
        "close-window" => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.close();
            }
        }
        _ => {}
    });
    Ok(())
}
