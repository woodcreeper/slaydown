# SlayDown 0.3.2 preview

Linux native menus now follow the reader’s light/dark setting without a white strip behind the menu text. System mode restores the desktop preference. Changes made in the preview also update the full reader’s menu.

Sushi previews have a compact Appearance toolbar without a repeated filename or duplicate Open button. If your default app is another editor, the separate Open in SlayDown action remains available. Windows keeps its existing preview controls.

**Upgrading on Omarchy:** quit the old app, replace it with this version, and launch SlayDown once to refresh the bundled adapter. Close any preview, then log out and back in so Sushi reloads the updated adapter. Your appearance preferences are preserved. Sushi must be installed separately if it is missing; Appearance → Linux integration shows its status.

## Downloads

- **Mac (Apple Silicon + Intel, macOS 12+):** `SlayDown-macOS-universal.zip`. Unzip and move SlayDown to Applications.
- **Windows x64:** download and run the `-setup.exe` installer.
- **Linux x64:** install the `.deb` on a compatible Ubuntu/Debian desktop, or make the `.AppImage` executable and run it.
- **Omarchy/Linux preview:** included in the app. Install Sushi separately if missing, then open SlayDown once. The optional `SlayDown-Sushi.tar.gz` remains for scripted/legacy installs.
- **Windows preview:** `SlayDown-QuickLook.qlplugin`. Install QuickLook 4.5.0+, select this plugin in Explorer, press Space, install, and restart QuickLook.
- **SHA256SUMS.txt:** checksums for all app packages and adapters.

[Preview installation and troubleshooting](https://github.com/woodcreeper/slaydown/blob/main/preview/README.md)

[Full installation instructions](https://github.com/woodcreeper/slaydown#install) · [Build from source](https://github.com/woodcreeper/slaydown/blob/main/docs/DEVELOPMENT.md)

## Preview status

These packages are not Developer ID-signed/notarized on Mac or publisher-signed on Windows. Security prompts are expected; follow the installation guide. The Mac bundle is signed ad hoc. The release workflow requires builds and automated tests on all three platforms before publishing. Space-bar preview was confirmed on physical Omarchy with 0.3.0. The native Linux menu and Sushi preview are checked in CI; the 0.3.2 appearance cleanup still needs a physical Omarchy pass; Windows Explorer acceptance is also pending. Preview documents are snapshots; reopen to see edits. The full reader still refreshes automatically.

Mac Quick Look is included and experimental. Enable the extension in System Settings after opening SlayDown once. Its native renderer passes a smoke test; Finder integration needs broader testing. Quick Look uses the default style and image placeholders.

Built-in editing, annotations, mobile, Mermaid, math, and local Markdown-to-Markdown navigation are not included. Raw HTML and remote images stay inert; documents are limited to 10 MiB of UTF-8 Markdown.

[Report a problem](https://github.com/woodcreeper/slaydown/issues). Please include your OS version and a small non-private example.
