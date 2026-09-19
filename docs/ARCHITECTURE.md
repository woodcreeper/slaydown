# Architecture and continuation

SlayDown is a desktop-first Markdown viewer with a shared rendering core. Mobile is intentionally deferred. The working name and colors are provisional; neither affects the file format or native integration.

## Boundaries

- `src/renderer.ts`: synchronous Markdown → HTML, headings, approximate reading statistics. No DOM, file access, or native API. Bundles to `FolioRenderer` for JavaScriptCore.
- `src/reader.css`: common typography, code colors, and themes. App chrome is separate in `src/style.css`.
- `src/tint.ts`: optional color tint over the CSS palette for both app chrome and reading surfaces. Reads each preset’s default tokens, prepares light/dark variants, and adjusts accent contrast against their backgrounds. Preferences store only the chosen hex color (or `null` for neutral), alongside style, theme, and size.
- `src/main.ts`: one current document (or an empty reader), outline, source view, search, style/theme/tint/size controls, and presentation. Opening replaces the current preview; Close invalidates pending refresh/image work and clears the reader. Keeps original source separate from rendered HTML.
- `src/reading-position.ts`: captures the visible block and nearby headings, restores that anchor after document changes, and falls back to proportional position when no matching block survives. Explicit navigation invalidates late image restoration.
- `src/platform.ts`: browser/desktop boundary and common document shape `{ name, path, content }`.
- `src-tauri/src/documents.rs`: read-only local document session and bounded local image loading. Canonical paths constrain image access to an opened document’s directory tree.
- `src-tauri/src/lib.rs`: native picker, OS open events, file associations, and external web/email links. Startup documents stay available until the frontend subscribes.
- `src-tauri/src/menu.rs`: native Open and Close Document commands. Cmd/Ctrl+W closes the document; Cmd/Ctrl+Shift+W closes the window. The webview handles these shortcuts only in browser mode, preventing duplicate native handling.
- `src-tauri/src/editor.rs`: validated application selection and preference persistence. Launches only the selected app with the authorized document as a literal argument. Prevents opening SlayDown recursively.
- `src-tauri/src/watcher.rs`: one native parent-directory subscription for the current document; handles atomic saves, debounces events, and stops its worker on replacement. No idle polling.
- `macos/QuickLook`: sandboxed native data-based preview provider. Reads the selected UTF-8 file and uses JavaScriptCore to run the same packaged renderer. No app backend or web bridge exists in the preview process.

## Lightweight choices

The app uses the OS webview through Tauri. It does not include Electron, React, an editor, or a background service. Linux AppImage packaging may include additional runtime libraries for portability. The shared renderer includes only eleven common highlighting grammars. The local Apple Silicon Mac app is approximately 3.8 MB installed (universal and other platform builds differ); build dependencies and caches are much larger and are excluded from the app.

Markdown files are neither uploaded nor written by SlayDown; the external editor owns edits. SlayDown writes only its own editor and appearance preferences; browser-only mode uses local storage. Remote images are placeholders; web and mail links open only after a click. Raw HTML is displayed as text. This makes the rendering behavior predictable for untrusted Markdown, with the same output in the app and Quick Look.

## Editing path

Add an explicit editor pane which changes the source string and reuses `renderMarkdown`. Add saving as a separate native command with a document revision/mtime check and conflict handling. Keep the read-only Quick Look provider independent. The current source viewer is not an editor; no document-save API or general filesystem write permission is present.

Do not add a plugin framework until a concrete feature requires it. Reasonable next increments are local Markdown links, a persistent recent-file list (paths only, after a privacy decision), and opt-in math/diagram rendering.

## Verification recorded through 2026-09-18

- TypeScript and production frontend build pass.
- 8 renderer tests pass: syntax, tasks/footnotes, IDs, Unicode, escaping, safe links/images, and reading statistics.
- 15 browser interaction tests pass: baseline viewing, style/tint persistence, accent contrast, editor selection/cancellation, automatic save refresh, temporary disappearance, source position, stale-response protection, late-image navigation, single-document replacement, and closing/reopening while a refresh is in flight.
- 20 Rust tests pass for document/security checks, single-document authorization and closing deleted files, editor validation and persistence, literal launch arguments, actual in-place and atomic saves, debounce timing, and worker shutdown. Real macOS watcher tests need execution outside the filesystem sandbox.
- Universal native Quick Look compile and JavaScriptCore smoke tests pass.
- Complete Mac app and nested Quick Look extension pass strict code-signature verification using ad-hoc signing.
- The rebuilt single-document Mac app was checked with ⌘W, the filename’s close button, and ⌘O from the empty reader. Closing leaves the window open; opening a real Markdown file renders it and resumes live preview. Windows/Linux native menu behavior still needs hands-on verification.
- The rebuilt Mac app shows the new tint controls and opens the native macOS color picker. Browser tests verify immediate custom-color updates, persistence/reset, and readable link/control contrast across all four styles in both system color schemes.
- macOS detects `net.daringfireball.markdown`; SlayDown’s Quick Look extension is registered and explicitly enabled.
- On 2026-09-18, Finder Space-bar preview successfully rendered the public video demo plan with headings, paragraphs, a quote, task lists, and a table in light mode. Double-clicking the file opened it in SlayDown, and Open in Editor launched the same file in iA Writer. Only the demo file’s Open With association was changed.
- The earlier `qlmanage -p` crash in Apple’s ExtensionFoundation (`key cannot be nil`) is separate from the successful Finder test. Quick Look dark mode, missing images, and broader Mac coverage still need individual checks.
- Windows/Linux native tests pass in GitHub Actions. Packaged file associations, installer interaction, and actual external-editor launching still need manual verification on those platforms.
- On 2026-09-18, the user confirmed the previous Folio build works on their physical x86_64 Omarchy 4.0.4-1 machine. The installation method and individual desktop integration checks were not specified; this does not establish validation of the experimental Arch package or Wayland workflow.

## Local operations

`npm run desktop:build` builds/tests the Quick Look extension automatically on macOS, embeds it, then signs the outer app. The extension must be signed first: Tauri’s extra-file mapping does not independently sign nested extensions. The default identity `-` is for local development; Developer ID signing/notarization is needed for trusted Mac distribution without unidentified-developer warnings; the first public preview is ad-hoc signed. Override host signing settings and `FOLIO_SIGNING_IDENTITY` together for distribution.

The current app output is `src-tauri/target/release/bundle/macos/SlayDown.app`. Old Folio/Riffdown bundles under the ignored `build/` directory are historical local backups. Build packages from current source before distributing binaries; do not distribute those backups. Current host architecture is Apple Silicon; the bundled extension contains both Intel and Apple Silicon slices.

Source and installation documentation are published at https://github.com/woodcreeper/slaydown under the MIT license. The GitHub Actions workflow builds universal Mac, Windows x64, and Linux x64 packages; manual release runs publish only after every platform succeeds. See DEVELOPMENT.md for the release procedure and the Releases page for available binaries.

## Reading-style scope

The app persists reading style, theme, tint, and size independently. Five lightweight CSS presets share the same rendering output. Tint starts from each preset’s stylesheet palette; clearing the tint restores that palette. Computed hex colors avoid requiring CSS `color-mix()` on older platform webviews. No parser changes, remote fonts, or extra JS rendering packages are needed. Quick Look keeps the neutral default SlayDown styling; sharing user preferences with its sandbox is a separate future integration.

## Refresh and launch invariants

Frontend selection and refresh counters reject stale results, including after Close. Native watcher changes are serialized so delayed requests cannot reselect an earlier file; an empty reader watches no path. Recreating a subscription also recovers a failed same-path watcher. Successfully opening a new document replaces the native authorization for the old one. Closing removes authorization even if the file was deleted, without clearing a newer startup document. A chooser cancellation launches nothing; files and app paths are passed as separate process arguments. SlayDown never invokes the shell with document content.

## Product rename compatibility

SlayDown 0.2.0 was previously Folio. The executable is now `slaydown`, but the host identifier remains `dev.mdquickviewer.folio` and the extension identifier remains `dev.mdquickviewer.folio.QuickLook`. The `folio:settings` storage key, `folio` default-style ID, `folio-` heading IDs, `FolioRenderer` JavaScript namespace, and `FolioQuickLook` Swift module are intentionally stable. This preserves preferences, document fragments, and OS associations instead of treating the rename as a different app. Existing `FOLIO_*` build overrides remain supported.

The desktop stylesheet bundles Metal Mania for the brand and Omarchy for the optional Omarchy heading preset. Vite emits local font assets; no remote font service or system font installation is required. Font licenses ship under `public/licenses/`. Quick Look retains the default system-font reader and does not load these app-only faces.


## Linux and Windows Space-bar adapters (0.3.0)

`src/preview.ts` builds to a self-contained offline HTML page using the existing renderer, reader styles, tint function, and style catalog. Rust embeds it and exposes a narrow CLI before GUI/single-instance startup: `--preview-html`, `--preview-image`, `--preview-appearance`, and `--preview-save` (JSON on stdin). Each document operation uses its own `DocumentStore`; it cannot replace or authorize access to the full reader's document. Markdown remains untrusted text and all document/image bounds still apply.

`appearance.json` in the stable application config directory is shared by the reader and adapters. The full reader migrates `folio:settings` only if the native file does not exist. Fresh Omarchy is detected through its installed data directory or `OMARCHY_PATH`; an existing selection always wins. Writes are validated and atomic. Open surfaces poll for settings changes every two seconds with in-flight/user-change guards; save failures are visible.

Sushi loads a per-user GTK3 or GTK4 adapter according to its installed version. Windows uses a separately packaged QuickLook plugin and WebView2. Both adapters only expose fixed appearance, current-document image/open, and dismiss messages; neither evaluates document-derived shell commands. Their GPL licensing is isolated from the MIT app via the CLI/message boundary. See `preview/README.md` for installation, limits, and acceptance checks. macOS Quick Look remains independent of this preference store.
