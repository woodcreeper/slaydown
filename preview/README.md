# Space-bar previews

SlayDown 0.3.1 includes Markdown adapters for **Sushi on Linux** and **QuickLook on Windows**. macOS continues to use the bundled Quick Look extension. These are community integrations, not official Omarchy or Microsoft plugins.

The Linux and Windows adapters use SlayDown's installed renderer, bundled fonts, and `appearance.json` settings. They do not start the full reader or replace its open document. Open SlayDown once after upgrading to migrate any older appearance preferences before using the new preview.

## Omarchy / Linux (Nautilus + Sushi)

1. Quit any running Folio/SlayDown, then install **SlayDown 0.3.1 or later** and open it once. Both the native package and AppImage include the adapter; a separate adapter download is no longer required.
2. **Sushi is a separate system prerequisite.** On Omarchy run `sudo pacman -S --needed sushi gjs`. On Debian/Ubuntu install `gnome-sushi` and `gjs`. SlayDown’s **Appearance → Linux integration** shows missing dependencies and the matching WebKit package command. Choose **Check again** after installing them.
3. SlayDown registers its current executable and icon, migrates a Folio Markdown default even if the old binary was deleted, and installs/updates the adapter for your Sushi version. It preserves defaults pointing to other editors. Choose **Use SlayDown for Markdown** if you want to change those explicitly.
4. Log out and back in after the first adapter installation or a Sushi major upgrade to restart the preview host. In **Files (Nautilus)**, select a local Markdown file and press **Space**. Other file types keep their existing previews.

On each subsequent app launch, SlayDown refreshes changed launcher/adapter files only. An AppImage launcher uses the permanent `APPIMAGE` path, never its temporary mount directory. After moving or replacing the AppImage, open the new file once. Preview mode itself never runs installation or changes defaults.

The integration writes per-user files under `XDG_DATA_HOME` (normally `~/.local/share`): `applications/SlayDown.desktop`, `slaydown/icon.png`, `slaydown/integration.json`, and the matching `sushi/viewers/slaydown.js` (Sushi 46–50) or `sushi/plugins-1/slaydown.js` (51+). GIO manages the Markdown MIME defaults. Old app binaries are not deleted. Disable **Space-bar preview in Files** to remove the adapter; that choice persists across upgrades and launches. No privileged background installer or global keyboard hook is used.

Choose **Appearance** in the preview to change style, theme, tint, or size. Fresh Omarchy installs default to **Omarchy**, with its bundled heading font, system theme, and neutral tint. Existing choices are preserved and synchronize between the preview and reader. Preview content is a snapshot; close/reopen after editing. The full reader refreshes automatically.

### If Sushi says “Open With Folio”

That button uses the Linux default Markdown application. **Upgrade to 0.3.1, quit the old app, and launch the new one once.** SlayDown migrates the old default automatically. Log out/back in to clear any cached Folio process or application label. You do not need a separate repair command.

For older 0.3.0 installations only, the [legacy repair helper](https://raw.githubusercontent.com/woodcreeper/slaydown/v0.3.1/preview/linux/repair-desktop.py) remains available. It is a compatibility tool, not the normal install/upgrade path.

For scripted deployments, `slaydown --linux-integrate` runs the same lifecycle as the app and reports JSON status. Optional `--set-default`, `--enable-preview`, and `--disable-preview` correspond to Settings controls. A missing Sushi prerequisite is reported with `previewReady: false` and an installation hint; installing system packages still requires the normal package manager. The separate adapter archive’s installer delegates to this lifecycle on 0.3.1+, retaining its legacy implementation only for 0.3.0.

### If Space still shows plain text

- Check `pacman -Q sushi` and reopen SlayDown after a major Sushi upgrade.
- Check `xdg-mime query filetype /absolute/path/notes.md`; it must report `text/markdown` or `text/x-markdown`. Files detected as plain text are handled by Sushi's plain-text viewer.
- Verify `slaydown --preview-appearance` works (or use the AppImage path). A 0.2.x binary does not have the preview bridge.
- Restart your login session after installing. SlayDown 0.3.1 installs the bundled adapter when you launch the reader; check its Linux integration status.
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

Automated checks cover shared preferences, rendering, document isolation, native command validation, both platform builds, and a Linux Sushi runtime smoke test. A user confirmed Space-bar preview works on physical Omarchy after separately installing Sushi (September 19, 2026); the stale Folio association was reported during that test. Windows Explorer acceptance is still required; CI is not proof of every desktop shortcut configuration.
