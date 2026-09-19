# Building SlayDown

SlayDown is a Tauri 2 desktop application with a TypeScript frontend and a separate Swift Quick Look extension on macOS. Build packages on the operating system they target. There is no server or database to configure.

## Common prerequisites

- Git, a current **Node.js 22 or 24 LTS** release (22.12+), and npm.
- A current stable Rust toolchain from [rustup](https://rustup.rs/) (minimum Rust 1.88).
- The platform tools below. See the maintained [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for details and other Linux distributions.

```sh
git clone https://github.com/woodcreeper/slaydown.git
cd slaydown
npm ci
```

The first build downloads npm and Cargo dependencies. Lockfiles are committed. The optional `.tools/` directory used during local development is ignored; normal installations use Rust from your PATH.

## macOS

Install Xcode, open it to accept its license/install components, and select it as the active developer directory if necessary:

```sh
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
npm run desktop:build -- --bundles app
```

The output is `src-tauri/target/release/bundle/macos/SlayDown.app`. Copy it into Applications. The build wrapper compiles, smoke-tests, and embeds the Quick Look extension before Tauri seals the app bundle. Local builds use ad-hoc signing.

For one app supporting both Apple Silicon and Intel:

```sh
rustup target add aarch64-apple-darwin x86_64-apple-darwin
npm run desktop:build -- --target universal-apple-darwin --bundles app
```

Find the app under `src-tauri/target/universal-apple-darwin/release/bundle/macos/`. The Quick Look extension is universal by default. See [native extension details](../macos/README.md), including the separate Developer ID signing and notarization work needed for a trusted public release.

## Windows

Install Visual Studio Build Tools with **Desktop development with C++** and a Windows SDK. Install the Microsoft Edge **WebView2 Runtime** if absent. Use the MSVC Rust toolchain recommended by rustup, then run these commands in PowerShell:

```powershell
npm ci
npm run desktop:build -- --bundles nsis
```

The installer is under `src-tauri/target/release/bundle/nsis/`. CI currently targets x64. The installer is unsigned until a publisher signing certificate is configured.

## Linux

On Ubuntu/Debian, install the native build dependencies:

```sh
sudo apt update
sudo apt install build-essential curl wget file libwebkit2gtk-4.1-dev \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev patchelf
npm ci
npm run desktop:build -- --bundles deb,appimage
```

The packages are under `src-tauri/target/release/bundle/deb/` and `src-tauri/target/release/bundle/appimage/`. AppImage build tooling may also need FUSE 2 (`libfuse2` on Ubuntu 22.04). CI uses Ubuntu 22.04 for a reasonably broad glibc baseline. Other distributions should use their matching [Tauri packages](https://v2.tauri.app/start/prerequisites/#linux).

## Develop and verify

```sh
npm run desktop       # native development; starts its own Vite server
npm run dev           # alternatively, browser-only preview on port 1420
```

Run one of these at a time; both use port 1420. Browser preview supports rendering and appearance, but not native editor launch, file watching, or local image resolution.

```sh
npm test
npm run build
cargo test --locked --manifest-path src-tauri/Cargo.toml
```

For browser interaction tests, install Google Chrome (or run `npx playwright install chrome`), start `npm run dev` in another terminal, and run `npm run test:ui`. Some tests mock the Tauri bridge; they verify UI behavior, not actual desktop integration.

On Mac, `npm run build:quicklook -- --test` exercises the bundled renderer in JavaScriptCore. The [Finder acceptance checks](../macos/README.md#finder-acceptance-checks) remain a separate manual step.

## Releases

The [Build and release workflow](../.github/workflows/build.yml) tests and builds on Mac, Windows, and Linux. Pushes to `main` and pull requests produce build artifacts; a feature-branch push alone does not start this workflow. Manual runs with an empty version also build without publishing. Unreleased changes are tracked in the [changelog](../CHANGELOG.md). To publish a preview:

1. Keep the version in `package.json`, `package-lock.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `src-tauri/tauri.conf.json`, and the Quick Look `Info.plist` consistent.
2. Move the relevant changelog entries under the new version and update [release notes](RELEASE_NOTES.md), then commit and push to `main`. Use a new version; existing releases are immutable.
3. Run the workflow manually on `main`, entering the version (such as `0.3.0`). Leave it blank for a build without publishing.
4. After every platform succeeds, the workflow validates versions, gathers four app packages and both preview adapters, computes SHA-256 checksums, and creates a prerelease/tag at the exact built commit. It refuses to overwrite an existing release.

No signing credentials are stored in the repository. The current Mac and Windows packages are preview builds without trusted publisher signatures. The workflow pins its third-party actions to commit hashes; review those pins when updating build infrastructure.

Linux/Windows Space-bar adapters have separate host dependencies and packaging steps; see [preview development and setup](../preview/README.md). Run `npm run build` before native CLI/tests so the embedded standalone preview page exists.
