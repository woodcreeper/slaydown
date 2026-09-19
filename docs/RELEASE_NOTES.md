# SlayDown 0.3.0 preview

Space-bar Markdown previews now extend to **Omarchy/Linux via Sushi** and **Windows via the QuickLook companion**. Install the app and the matching preview adapter below; the app alone does not hook Space in your file manager.

The previews share SlayDown's five styles, theme, tint, and reading size with the full app. Fresh Omarchy installations default to the bundled Omarchy heading font. Open SlayDown once after upgrading to migrate previous appearance choices. Existing choices are preserved.

## Downloads

- **Mac (Apple Silicon + Intel, macOS 12+):** `SlayDown-macOS-universal.zip`. Unzip and move SlayDown to Applications.
- **Windows x64:** download and run the `-setup.exe` installer.
- **Linux x64:** install the `.deb` on a compatible Ubuntu/Debian desktop, or make the `.AppImage` executable and run it.
- **Omarchy/Linux preview:** `SlayDown-Sushi.tar.gz`. Extract and run its per-user installer after installing/upgrading SlayDown, then log out/back in.
- **Windows preview:** `SlayDown-QuickLook.qlplugin`. Install QuickLook 4.5.0+, select this plugin in Explorer, press Space, install, and restart QuickLook.
- **SHA256SUMS.txt:** checksums for all app packages and adapters.

[Preview installation and troubleshooting](https://github.com/woodcreeper/slaydown/blob/main/preview/README.md)

[Full installation instructions](https://github.com/woodcreeper/slaydown#install) · [Build from source](https://github.com/woodcreeper/slaydown/blob/main/docs/DEVELOPMENT.md)

## Preview status

These packages are not Developer ID-signed/notarized on Mac or publisher-signed on Windows. Security prompts are expected; follow the installation guide. The Mac bundle is signed ad hoc. The release workflow requires builds and automated tests on all three platforms before publishing. Hands-on Windows Explorer and Omarchy/Hyprland shortcut acceptance is still needed. Preview documents are snapshots; reopen to see edits. The full reader still refreshes automatically.

Mac Quick Look is included and experimental. Enable the extension in System Settings after opening SlayDown once. Its native renderer passes a smoke test; Finder integration needs broader testing. Quick Look uses the default style and image placeholders.

Built-in editing, annotations, mobile, Mermaid, math, and local Markdown-to-Markdown navigation are not included. Raw HTML and remote images stay inert; documents are limited to 10 MiB of UTF-8 Markdown.

[Report a problem](https://github.com/woodcreeper/slaydown/issues). Please include your OS version and a small non-private example.
