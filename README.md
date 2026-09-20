<div align="center">
  <img src="public/favicon.svg" width="72" alt="SlayDown icon">
  <h1>SlayDown</h1>
  <p><strong>A little room to read.</strong></p>
  <p>A lightweight Markdown viewer for Mac, Windows, and Linux.<br>Beautiful typography. Ordinary files. Your favorite editor, one click away.</p>
  <p><a href="https://github.com/woodcreeper/slaydown/releases">Downloads</a> · <a href="#install">Install</a> · <a href="docs/DEVELOPMENT.md">Build from source</a> · <a href="https://github.com/woodcreeper/slaydown/issues">Feedback</a></p>
  <p><a href="https://github.com/woodcreeper/slaydown/actions/workflows/build.yml"><img src="https://github.com/woodcreeper/slaydown/actions/workflows/build.yml/badge.svg" alt="Build status"></a> <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-sage" alt="MIT license"></a></p>
</div>

## From agent output to a beautiful read

**Formerly Folio.** Same lightweight reader, a more distinctive name.

Your AI agent writes the Markdown. Select a file in Finder, press **Space**, and read it beautifully formatted. Double-click for SlayDown’s full reader, then open the same file in your favorite editor when you want to make a change. Save there, and SlayDown updates automatically.

https://github.com/user-attachments/assets/af304568-818d-4b9f-8540-d638357e0590

Music: [Eyesplit by Shane Ivers](https://www.silvermansound.com/free-music/eyesplit), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Edited to 30 seconds, normalized, and faded.

![SlayDown displaying its sample document, with a heading outline and a quiet reading layout](docs/images/slaydown.png)

## Read first. Edit where you like.

Open a Markdown file and get straight to the words. SlayDown keeps your source untouched and gives it comfortable spacing, readable code, and a clear outline. When you want to make a change, **Open in Editor** sends the same file to your chosen editor. Save there, and SlayDown refreshes while keeping your place.

- **Five reading styles:** SlayDown, VS Code-inspired, iA Writer Classic-inspired, GitHub-inspired, and Omarchy.
- **Your preferred appearance:** light, dark, or system, with a neutral default, custom color tint, adjustable text size, and remembered settings.
- **Easy navigation:** a heading outline, document search, and a read-only source view.
- **One file at a time:** opening another file replaces the current preview. Close it with the × beside its name or **⌘W / Ctrl+W**, and SlayDown stays ready for the next file.
- **Markdown essentials:** tables, highlighted code, task lists, footnotes, and local raster images.
- **Space-bar preview:** a bundled Mac Quick Look extension, plus optional Sushi (Linux) and QuickLook (Windows) adapters.
- **Local by design:** no accounts, uploads, or analytics. Built with Tauri and platform webviews.

## Install

**SlayDown is an early preview.** Get packages from the [Releases page](https://github.com/woodcreeper/slaydown/releases). The release workflow produces the following files after all platform builds and automated tests pass. If a release is still building, you can [build from source](docs/DEVELOPMENT.md).

**[Download SlayDown 0.3.1](https://github.com/woodcreeper/slaydown/releases/tag/v0.3.1)** — the current preview adds automatic Linux desktop setup and Folio upgrade migration. Space-bar previews share the reader’s appearance settings. Older v0.1.0 downloads retain the Folio name.

| Computer | Download | Requirements |
| --- | --- | --- |
| Mac — Apple Silicon or Intel | [SlayDown-macOS-universal.zip](https://github.com/woodcreeper/slaydown/releases/download/v0.3.1/SlayDown-macOS-universal.zip) | macOS 12 or later |
| Windows PC — x64 | [SlayDown_0.3.1_x64-setup.exe](https://github.com/woodcreeper/slaydown/releases/download/v0.3.1/SlayDown_0.3.1_x64-setup.exe) | Windows 10 or 11; WebView2 |
| Ubuntu / Debian — x64 | [SlayDown_0.3.1_amd64.deb](https://github.com/woodcreeper/slaydown/releases/download/v0.3.1/SlayDown_0.3.1_amd64.deb) | Ubuntu 22.04+ or a compatible Debian-based desktop with WebKitGTK 4.1 |
| Other Linux desktops — x64 | [SlayDown_0.3.1_amd64.AppImage](https://github.com/woodcreeper/slaydown/releases/download/v0.3.1/SlayDown_0.3.1_amd64.AppImage) | A compatible glibc-based desktop; see Linux notes below |

Filenames may vary slightly; choose the matching extension in the release assets. Preview builds are **not Developer ID-signed/notarized on Mac or publisher-signed on Windows**. Mac bundles are signed ad hoc for bundle integrity. Operating systems may show security warnings. Managed computers may require administrator approval. Checksums are included as `SHA256SUMS.txt`.

### macOS

1. Download and unzip `SlayDown-macOS-universal.zip`.
2. Drag **SlayDown.app** into **Applications**, then open it.
3. If macOS blocks it as an unidentified developer, review the warning. If you trust this release, use **System Settings → Privacy & Security → Open Anyway**, then confirm. See [Apple’s guidance](https://support.apple.com/en-us/102445).
4. Open a Markdown file with **⌘O**, or drag it into SlayDown.

**Space-bar preview:** open SlayDown once, then enable its Quick Look extension in System Settings if needed. On recent macOS versions, look under **General → Login Items & Extensions → Quick Look**; older versions may use **Privacy & Security → Extensions → Quick Look**, or **System Preferences → Extensions** on macOS Monterey. Select a Markdown file in Finder and press **Space**. Other Markdown Quick Look extensions may take precedence.

**Upgrading from Folio:** on Mac, quit Folio and replace the old app with SlayDown in Applications. The app keeps the same internal identity, so saved preferences carry over. Keep one installed copy to avoid ambiguous file associations.

**Double-click to open in SlayDown:** select a `.md` file in Finder, choose **Get Info → Open with → SlayDown → Change All**. SlayDown does not replace your current default automatically.

**If macOS says a Markdown file “could not be verified”:** choose **Done** to keep the file, then open it from inside SlayDown with **⌘O**. A file-specific Finder “Open With” override combined with quarantine metadata can trigger this warning even for plain text; [Apple documents the interaction](https://developer.apple.com/forums/thread/795994). This is separate from an unsigned-app warning. SlayDown does not remove quarantine metadata or disable macOS security checks.

Finder’s Space-bar preview, double-clicking into SlayDown, and opening the same file in iA Writer were verified on the development Mac on September 18, 2026. Quick Look remains experimental pending broader testing across Macs. See [Quick Look troubleshooting and acceptance checks](macos/README.md). Quick Look uses the default SlayDown reading style and shows placeholders for images.

### Windows

1. Download the **x64 `-setup.exe`** from Releases and run it.
2. Follow the installer. It can install Microsoft Edge WebView2 if the runtime is missing; that step needs an internet connection.
3. Open **SlayDown** from Start, then press **Ctrl+O** or drag in a Markdown file.

**Space-bar preview:** install the separate QuickLook companion, then the `SlayDown-QuickLook.qlplugin` release asset. Select the plugin in Explorer, press Space, install it, and restart QuickLook. [Full preview setup](preview/README.md#windows-file-explorer--quicklook).

An unsigned preview may trigger SmartScreen. Check that the file came from this repository’s release; if you trust it and Windows offers the option, choose **More info → Run anyway**. Some Windows 11 configurations with Smart App Control may block unsigned previews altogether. See [Microsoft’s SmartScreen guidance](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/smartscreen-reputation).

To use SlayDown for double-clicks, right-click a `.md` file, choose **Open with → Choose another app**, and select SlayDown as the default. Windows ARM64 packages are not currently provided.

### Linux

On Ubuntu or Debian, download the `.deb`, then run the following from its download folder (substitute the actual filename):

```sh
sudo apt install ./SlayDown_0.3.1_amd64.deb
```

This installs the package and resolves its system dependencies. Launch SlayDown from your application menu.

For an AppImage, download the `.AppImage`, then make it executable and run it:

```sh
chmod +x SlayDown_0.3.1_amd64.AppImage
./SlayDown_0.3.1_amd64.AppImage
```

AppImages are built on Ubuntu 22.04 and are not guaranteed to work on every distribution. If FUSE is unavailable, try `./SlayDown_0.3.1_amd64.AppImage --appimage-extract-and-run`. See [Tauri’s AppImage compatibility notes](https://v2.tauri.app/distribute/appimage/). Linux ARM64 packages are not currently provided.

Quit the old app, install the update, and launch SlayDown once. It registers the current executable, migrates old Folio Markdown defaults, and installs or refreshes its bundled Sushi adapter when Sushi is available. Other editor defaults are preserved. **Appearance → Linux integration** shows setup status, lets you make SlayDown the default, and enables/disables preview. AppImage users should keep the file in a permanent location; launch it once after moving or replacing it to refresh its launcher and preview path. Sushi itself is a separate system dependency. [Preview setup and troubleshooting](preview/README.md#omarchy--linux-nautilus--sushi).

### Omarchy / Arch Linux

The app (then named Folio) has been confirmed working on **Omarchy 4.0.4-1, x86_64**, through a user test on a physical machine on September 18, 2026. An [experimental native Arch package and Wayland check](packaging/arch/README.md) are also saved in this repository; that packaging path has not been separately verified. On September 19 the user also confirmed Space-bar preview works after installing Sushi. In 0.3.1 the app manages its bundled adapter automatically. Install Sushi using the [preview instructions](preview/README.md#omarchy--linux-nautilus--sushi), open SlayDown once, then log out/back in. Fresh Omarchy installations default to Omarchy headings; existing preferences are preserved. This is a community Sushi adapter, not an official Omarchy shell plugin.

## Make it yours

Open **Appearance** (the **Aa** button) to choose a reading style, theme, tint, or text size. Under **Tint**, pick a swatch or click **Custom color** to open your system’s color picker. Changes preview immediately and are remembered. **Neutral** restores the selected style’s original palette. Tint affects accents and adds a subtle wash to the page; it leaves your Markdown unchanged. Linux/Windows previews share these preferences with the full app. Open SlayDown once after upgrading to migrate older settings. Mac Quick Look still uses the neutral SlayDown default.

**Omarchy** uses [Mark Cuda’s Omarchy Font](https://github.com/markcuda/Omarchy-Font) for block-letter headings, paired with monospaced body text. SlayDown’s wordmark uses Metal Mania. Both fonts are bundled locally and work offline; see [font credits and licenses](docs/FONTS.md).

On Mac, choose **Show Colors…** in the picker for the full macOS color panel, including the color wheel. Tint works independently of your reading style, light/dark theme, and text size. Very bright or dark selections are adjusted for readable accent text.

Most reading styles use local system fonts, so details vary by platform; Omarchy’s heading font is bundled. They are original CSS inspired by familiar reading experiences, not exact replicas or affiliated products.

Choose **Open in Editor** to pick your editor once. On Mac, select its `.app`; on Windows, its `.exe`; on Linux, its executable. Change that choice under **Appearance → External Editor**. SlayDown watches the current file, including editors that save by replacing it, and preserves the visible paragraph when it refreshes. Source view keeps its proportional scroll position.

| Action | Mac | Windows / Linux |
| --- | --- | --- |
| Open a file | ⌘O | Ctrl+O |
| Close the current file | ⌘W | Ctrl+W |
| Close the app window | ⌘⇧W | Ctrl+Shift+W |
| Find in document | ⌘F | Ctrl+F |
| Open in your editor | ⌘⇧E | Ctrl+Shift+E |
| Increase / decrease text size | ⌘+ / ⌘− | Ctrl+ / Ctrl+− |
| Reset text size | ⌘0 | Ctrl+0 |

## What works today

SlayDown reads UTF-8 `.md`, `.markdown`, `.mdown`, and `.mkd` files up to **10 MiB**. The desktop app displays local raster images within the document’s directory and its child directories. For safety and offline reading, remote images, raw HTML, SVG, and executable links stay inert. File contents are not saved in preferences.

Built-in editing, annotations, Markdown-to-Markdown navigation, Mermaid, math, and mobile apps are future work. The renderer and document model are separate from the UI so editing can be added without replacing the reading foundation.

The Mac app has been exercised locally, and a user has confirmed the previous Folio build works on Omarchy. CI builds packages and runs Rust tests on all three desktop platforms, plus browser interaction tests on Linux. Windows/Linux installer behavior, external editors, and file associations still need individual hands-on verification. Please [report issues](https://github.com/woodcreeper/slaydown/issues) with your OS version and a minimal non-private sample.

## Build, contribute, or explore

See [development and platform build instructions](docs/DEVELOPMENT.md), [architecture](docs/ARCHITECTURE.md), and the [macOS extension notes](macos/README.md).

```sh
git clone https://github.com/woodcreeper/slaydown.git
cd slaydown
npm ci
npm run desktop
```

Install a current Node.js 22 or 24 LTS release, Rust, and the platform dependencies first. Browser-only development is available with `npm run dev`.

Built with [Tauri](https://tauri.app/), [markdown-it](https://github.com/markdown-it/markdown-it), [highlight.js](https://highlightjs.org/), TypeScript, and Swift. Reading styles take inspiration from [VS Code](https://github.com/microsoft/vscode/blob/main/extensions/markdown-language-features/media/markdown.css), [iA Writer Classic](https://ia.net/writer/support/preview/templates), and [GitHub Primer](https://github.com/primer/css/tree/main/src/markdown).

[MIT licensed](LICENSE); optional preview adapters are [GPL-3.0-or-later](preview/LICENSE). © 2026 David La Puma. Dependencies retain their respective licenses.
