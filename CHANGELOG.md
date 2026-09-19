# Changelog

## 0.3.0 — 2026-09-19

- Added optional Space-bar Markdown adapters for Nautilus/Sushi on Omarchy/Linux and QuickLook on Windows. The Windows workflow requires the separate QuickLook companion.
- Preview uses the same Markdown renderer, five reading styles, bundled fonts, local-image validation, and appearance preferences as the full reader. Space/Escape dismisses it; Open in SlayDown opens the same file in the full reader.
- Added a validated, atomic native appearance store, migration of existing webview choices, and synchronization between open reader/preview surfaces. Fresh Omarchy installs default to Omarchy headings without changing an existing selection.
- Added install/uninstall instructions, version-aware Sushi 46–50 / 51+ adapters, and reproducible Windows plugin packaging.
- Preview processes keep their document authorization separate from the full reader and never modify Markdown files. Mac Quick Look behavior is unchanged.

Physical Omarchy/Hyprland and Windows Explorer acceptance is still pending; see the [preview guide](preview/README.md).

## 0.2.0 — 2026-09-19

Published packages: [SlayDown 0.2.0 preview](https://github.com/woodcreeper/slaydown/releases/tag/v0.2.0) — universal Mac ZIP, Windows x64 installer, Linux x64 DEB/AppImage, and SHA-256 checksums. Built from commit `6fa13cf` in [successful build 35441130888](https://github.com/woodcreeper/slaydown/actions/runs/35441130888).

### Renamed

- Renamed the GitHub repository to `woodcreeper/slaydown` and updated documentation, package metadata, video links, and sharing graphics.
- Folio is now **SlayDown**, including the app, native menus, Quick Look display name, and package names.
- The application and extension identifiers, saved preferences, and default reading-style ID remain stable so existing installations retain their settings and Markdown associations.
- Published v0.1.0 packages retain their original Folio name.
- Refreshed the 30-second product film, native screenshots, sample documents, and sharing graphics for SlayDown. The film shows the Omarchy style and uses a licensed metal soundtrack, “Eyesplit” by Shane Ivers (CC BY 4.0).

### Added

- Omarchy reading style with bundled Omarchy display headings and monospaced body text.
- Metal Mania typography for the SlayDown wordmark; both font licenses ship with the app.

- Close the current document with the × beside its name, File → Close Document, or ⌘W / Ctrl+W. Folio stays open with an empty reader and an Open button.
- A playable 30-second walkthrough in the GitHub README, with its Remotion source in `video/`.
- Custom tint in Appearance: five preset swatches, the system color picker, and a Neutral reset. Changes preview immediately and persist across restarts.
- Automatic accent contrast adjustment for custom colors in light and dark mode, across all four reading styles.

### Changed

- Folio shows one file at a time. Opening another file replaces the previous preview; the sidebar focuses on the current document’s outline. Closing clears search and source content, releases the document session, and stops live refresh.
- Folio’s default page and app controls use a neutral palette in place of the green tint. The shared Quick Look default is neutral too; custom app preferences are not shared with Quick Look.
- Refreshed the README screenshot and appearance instructions.

Validation: 8 renderer tests, 15 browser interaction tests, 20 Rust tests, the local Mac build, the Swift Quick Look smoke test, and strict bundle signature checks pass. The rebuilt Mac app was checked with ⌘W, the close button, and ⌘O from the empty reader. The macOS color picker was opened in the earlier tint build. On September 18, Finder Space-bar rendering, double-click opening in Folio, and opening the same file in iA Writer were verified with the public video demo. Cross-platform automated checks and package builds are tracked in [GitHub Actions](https://github.com/woodcreeper/slaydown/actions/workflows/build.yml). On September 18, 2026, the user confirmed Folio works on an x86_64 Omarchy 4.0.4-1 machine. The new Close command, installer behavior, file associations, and external-editor launching still need individual hands-on checks on Windows/Linux.

## 0.1.0 — 2026-09-17

First desktop preview: four reading styles, light/dark/system appearance, outline, search, source view, external editor selection, automatic refresh preserving reading position, and an experimental macOS Quick Look extension.

Published packages: universal Mac ZIP, Windows x64 installer, and Linux x64 DEB/AppImage. See the [release](https://github.com/woodcreeper/slaydown/releases/tag/v0.1.0) for downloads and [preview notes](docs/RELEASE_NOTES.md) for limitations.
