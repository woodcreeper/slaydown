# SlayDown 0.3.1 preview

Linux installation and upgrades now handle desktop integration automatically. Quit the old app and launch the new SlayDown once: it registers the current executable and icon, migrates Folio Markdown defaults, and installs or refreshes its bundled Sushi adapter. This works with native packages and AppImages. Defaults pointing to another editor are preserved.

**Appearance → Linux integration** shows preview status and missing Sushi/WebKit dependencies, offers an explicit default-reader button, and lets you disable preview persistently. After installing Sushi, choose **Check again**. Log out/back in after first installing the adapter or upgrading Sushi. System packages are installed through the normal package manager, never silently by the app.

Reading styles, tint, theme, font size, and document behavior are unchanged. Fresh Omarchy installations still default to Omarchy headings; existing preferences are preserved. Windows continues to use the separate QuickLook companion and plugin; Mac Quick Look is unchanged.

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

These packages are not Developer ID-signed/notarized on Mac or publisher-signed on Windows. Security prompts are expected; follow the installation guide. The Mac bundle is signed ad hoc. The release workflow requires builds and automated tests on all three platforms before publishing. Space-bar preview was confirmed on physical Omarchy with 0.3.0. The new automatic upgrade flow still needs a physical Omarchy pass; Windows Explorer acceptance is also pending. Preview documents are snapshots; reopen to see edits. The full reader still refreshes automatically.

Mac Quick Look is included and experimental. Enable the extension in System Settings after opening SlayDown once. Its native renderer passes a smoke test; Finder integration needs broader testing. Quick Look uses the default style and image placeholders.

Built-in editing, annotations, mobile, Mermaid, math, and local Markdown-to-Markdown navigation are not included. Raw HTML and remote images stay inert; documents are limited to 10 MiB of UTF-8 Markdown.

[Report a problem](https://github.com/woodcreeper/slaydown/issues). Please include your OS version and a small non-private example.
