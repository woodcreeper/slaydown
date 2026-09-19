# Space-bar previews

SlayDown 0.3.0 adds Markdown adapters for **Sushi on Linux** and **QuickLook on Windows**. macOS continues to use the bundled Quick Look extension. These are community integrations, not official Omarchy or Microsoft plugins.

The Linux and Windows adapters use SlayDown's installed renderer, bundled fonts, and `appearance.json` settings. They do not start the full reader or replace its open document. Open SlayDown once after upgrading to migrate any older appearance preferences before using the new preview.

## Omarchy / Linux (Nautilus + Sushi)

1. Install SlayDown 0.3.0 or later. Omarchy already includes Nautilus (Files) and Sushi. The GTK3 adapter requires Sushi 46–50, GJS, and WebKitGTK 4.1. Sushi 51+ uses the GTK4 adapter and WebKitGTK 6.0 (`webkitgtk-6.0` on Arch). Python 3 is used only by the installer.
2. Download and extract `SlayDown-Sushi.tar.gz` from the same release.
3. Run `bash SlayDown-Sushi/install.sh`. For an AppImage, pass its absolute path: `bash SlayDown-Sushi/install.sh "$HOME/Applications/SlayDown_0.3.0_amd64.AppImage"`. Keep that file at the same location; rerun the installer if it moves.
4. Log out and back in to restart Sushi. In **Files**, select a local `.md`, `.markdown`, `.mdown`, or `.mkd` file and press **Space**. Press Space or Escape to close. Other file types continue using their existing Sushi previews.

Choose **Appearance** in the preview to change style, theme, tint, or size. On a fresh Omarchy install the default is **Omarchy**, with its bundled heading font, system theme, and neutral tint. Existing choices are preserved. Changes appear in another open preview or full reader within two seconds, and persist across restarts. Preview content is a snapshot; close/reopen after editing. The full reader retains its automatic file refresh.

The installer writes only `~/.local/share/sushi/viewers/slaydown.js` (Sushi 46–50) or `~/.local/share/sushi/plugins-1/slaydown.js` (51+), respecting `XDG_DATA_HOME`. No root access, global keyboard hook, or replacement D-Bus service is needed. Remove the adapter with `bash SlayDown-Sushi/install.sh --uninstall`, then log out/back in.

### If Space still shows plain text

- Check `pacman -Q sushi` and rerun the adapter installer after a major Sushi upgrade.
- Check `xdg-mime query filetype /absolute/path/notes.md`; it must report `text/markdown` or `text/x-markdown`. Files detected as plain text are handled by Sushi's plain-text viewer.
- Verify `slaydown --preview-appearance` works (or use the AppImage path). A 0.2.x binary does not have the preview bridge.
- Restart your login session after installing. Launching the full reader alone does not install the Sushi adapter.
- An AppImage also needs the normal FUSE/AppImage prerequisites. The native Arch package avoids that dependency.

## Windows (File Explorer + QuickLook)

Windows Explorer does not provide the Mac Space-bar workflow by itself. Install [QuickLook 4.5.0 or later](https://github.com/QL-Win/QuickLook/releases), a separate open-source companion that handles Space-bar selection in Explorer.

1. Install SlayDown 0.3.0 or later and launch it once.
2. Install/run QuickLook and download `SlayDown-QuickLook.qlplugin` from the SlayDown release.
3. Select the `.qlplugin` in Explorer, press **Space**, choose **Install**, then restart QuickLook.
4. Select a Markdown file in Explorer and press **Space**. Use Appearance to select any of the five reading styles. Space/Escape closes the preview; **Open in SlayDown** opens the same document in the full reader.

The adapter finds the standard per-user or all-users SlayDown install. If you installed elsewhere, the preview offers **Choose SlayDown…**; select `slaydown.exe`. Microsoft WebView2 is required (also used by SlayDown). Set QuickLook to run at login if you want Space available after restarting Windows.

Remove the adapter from QuickLook's plugin folder to revert to its built-in Markdown preview. QuickLook's own settings govern its global shortcut behavior.

## Privacy and architecture

- Shared Markdown renderer and typography, not a second Markdown implementation. Fonts and assets are offline.
- CLI operations are read-only for documents, enforce the same 10 MiB/UTF-8/extension checks, and run before the GUI/single-instance startup.
- Local raster images must be under the document folder; raw HTML, remote images, custom protocols, scripts from documents, and SVG remain blocked. External links are opened from the full reader.
- Appearance is validated and atomically persisted under the stable `dev.mdquickviewer.folio` application configuration folder. Both adapters invoke the installed SlayDown executable with argument arrays, never a shell command assembled from a filename.
- Preview adapters are GPL-3.0-or-later (see `LICENSE`) to integrate with their GPL hosts. SlayDown's app and shared renderer remain MIT. The renderer communicates with these adapters through a process/message boundary.
- Mac Quick Look still uses its independent default appearance; shared preview preferences in this release apply to Linux and Windows.

## Build and verification

`npm run build` builds the standalone preview HTML into the native executable. `node scripts/build-linux-preview.mjs` assembles the Sushi adapters. On Windows, `powershell -File scripts/build-windows-preview.ps1` builds the QuickLook package against its pinned release SDK.

Automated checks cover shared preferences, rendering, document isolation, native command validation, both platform builds, and a Linux Sushi runtime smoke test. A physical Nautilus/Hyprland and Windows Explorer acceptance pass is still required; CI is not proof of every desktop shortcut configuration.
