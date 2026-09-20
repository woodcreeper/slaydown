import './reader.css';
import './style.css';
import { renderMarkdown } from './renderer';
import { sample } from './sample';
import { readingStyles, normalizeAppearance, type Appearance } from './appearance';
import { applyTint, normalizeTint } from './tint';
import { capturePosition, restorePosition, scrollInstantly } from './reading-position';
import { documentFromFile, isDesktop, native, openLink, type MarkdownDocument } from './platform';

const icons: Record<string, string> = {
  book: '<path d="M4 4h6a3 3 0 0 1 3 3v13a4 4 0 0 0-4-2H4z"/><path d="M20 4h-4a3 3 0 0 0-3 3v13a4 4 0 0 1 4-2h3z"/>',
  open: '<path d="M3 7V5a1 1 0 0 1 1-1h5l2 3h9v3M3 10h18l-3 10H3z"/>',
  file: '<path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6M9 16h6"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
  sidebar: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
  code: '<path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 20"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  moon: '<path d="M20 15a9 9 0 0 1-11-11 9 9 0 1 0 11 11Z"/>',
  monitor: '<rect x="3" y="3" width="18" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  up: '<path d="m6 15 6-6 6 6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5M6 6a8 8 0 0 1 13 3M5 15a8 8 0 0 0 13 3"/>',
  edit: '<path d="m15 4 5 5M4 20l5-1L20 8a2 2 0 0 0-5-5L4 15z"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
};
const icon = (name: string) => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || ''}</svg>`;
const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const escape = (value: string) => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const demo: MarkdownDocument = { name: 'Welcome to SlayDown.md', path: 'sample:welcome', content: sample };
let current: MarkdownDocument | null = demo;
let sourceMode = false;
let sequence = 0;
let searchIndex = 0;
let searchMatches: HTMLElement[] = [];
let activeHeading = '';
let toastTimer: ReturnType<typeof setTimeout>;
let fontSize = 17;
let readingStyle: string = 'folio';
let tint: string | null = null;
const tintSwatches = [
  { name: 'Blue', color: '#5776c8' }, { name: 'Purple', color: '#9365b8' },
  { name: 'Rose', color: '#b96683' }, { name: 'Amber', color: '#bd8844' },
  { name: 'Sage', color: '#638568' },
];
interface EditorInfo { name: string; path: string }
let preferredEditor: EditorInfo | null = null;
let editorBusy = false;
let editorReady = false;
let selection = 0;
let refreshRequest = 0;
let scrollIntent = 0;
let desktopReady = false;
let watchHealthy = true;
let refreshTimer: ReturnType<typeof setTimeout>;
let watchQueue: Promise<void> = Promise.resolve();
let theme: 'light' | 'dark' | 'system' = 'system';
let legacyAppearance: Appearance | null = null;
try {
  const stored = localStorage.getItem('folio:settings');
  if (stored) legacyAppearance = normalizeAppearance(JSON.parse(stored));
} catch { /* Browser storage is optional. */ }
let appearanceReady = !isDesktop;
let appearanceQueue: Promise<void> = Promise.resolve();
let appearancePending = 0;
let appearanceRevision = 0;
function assignAppearance(value: Appearance) {
  ({ theme, fontSize, readingStyle, tint } = value);
}
if (legacyAppearance) assignAppearance(legacyAppearance);
// Hide the first frame until the native preferences have been loaded.
if (isDesktop) document.documentElement.style.visibility = 'hidden';

$('#app').innerHTML = `
  <header class="titlebar">
    <div class="brand"><span class="brand-mark">${icon('book')}</span><span class="brand-name">SlayDown<span class="brand-dot">.</span></span><span class="brand-description">MARKDOWN VIEWER</span></div>
    <div class="document-title">${icon('file')}<span id="filename"></span><span id="sample-badge" class="badge">SAMPLE</span><button id="close-document" class="icon-button" title="Close document (⌘W / Ctrl+W)" aria-label="Close document">${icon('close')}</button></div>
    <button id="appearance" class="icon-button" title="Appearance" aria-label="Appearance settings" aria-expanded="false">${icon('sun')}</button>
  </header>
  <div class="workspace">
    <aside class="sidebar" aria-label="Document navigation">
      <button class="open-button" id="open">${icon('open')}<span>Open a file</span><kbd id="open-key">⌘ O</kbd></button>
      <div class="sidebar-section outline-section"><div class="eyebrow">IN THIS DOCUMENT</div><nav id="outline" aria-label="Table of contents"></nav></div>
      <div class="sidebar-footer"><span class="privacy-dot"></span><span>Just your files. Just for you.</span></div>
    </aside>
    <main class="main">
      <div class="toolbar">
        <div class="toolbar-start"><button id="toggle-sidebar" class="icon-button" title="Toggle sidebar" aria-label="Toggle sidebar" aria-expanded="true">${icon('sidebar')}</button><span class="toolbar-divider"></span><span id="view-label">Reading view</span></div>
        <div class="toolbar-end"><button id="edit-external" class="text-button" title="Open in your editor (⌘⇧E / Ctrl+Shift+E)" aria-label="Open in Editor" hidden>${icon('edit')}<span>Open in Editor</span></button><span id="editor-divider" class="toolbar-divider" hidden></span><button id="find" class="icon-button" title="Find in document (⌘F / Ctrl+F)" aria-label="Find in document">${icon('search')}</button><button id="source" class="text-button" title="Toggle Markdown source" aria-pressed="false">${icon('code')}<span>Source</span></button><span class="toolbar-divider"></span><button id="type" class="type-button" title="Reading size" aria-label="Reading size settings" aria-expanded="false">Aa ${icon('down')}</button></div>
      </div>
      <div id="searchbar" class="searchbar" hidden><label class="search-field">${icon('search')}<input id="search-input" type="search" placeholder="Find in this document…" aria-label="Search document" autocomplete="off" /></label><span id="search-count" role="status"></span><button id="previous-match" class="icon-button" aria-label="Previous match">${icon('up')}</button><button id="next-match" class="icon-button" aria-label="Next match">${icon('down')}</button><button id="close-find" class="icon-button" aria-label="Close search">${icon('close')}</button></div>
      <div class="reading-scroll" id="reading-scroll"><div id="empty-state" class="empty-state" hidden><span class="empty-mark">${icon('book')}</span><h1>A little room to read.</h1><p>Open a Markdown file or drop one here.</p><button id="empty-open" class="open-button">${icon('open')}<span>Open a file</span></button></div><div class="reading-wrap"><div class="document-kicker"><span class="kicker-line"></span><span id="document-kicker">A QUIETER WAY TO READ</span></div><article id="reader" class="markdown-body" aria-label="Rendered Markdown"></article><pre id="source-content" class="source-content" aria-label="Markdown source" hidden></pre><div class="end-mark" aria-hidden="true"><span></span>${icon('book')}<span></span></div></div></div>
      <footer class="statusbar"><div><span class="status-dot"></span><span id="file-status">Sample document</span><button id="reload" class="small-button" title="Reload from disk" aria-label="Reload from disk" hidden>${icon('refresh')}</button></div><div id="document-stats"><span id="word-count"></span><span class="status-separator">·</span><span id="reading-time"></span><span class="status-separator">·</span><span id="reading-progress">0%</span></div></footer>
    </main>
  </div>
  <div id="settings" class="settings-popover" hidden><div class="eyebrow">READING STYLE</div><div class="reading-styles">${readingStyles.map(style => `<button data-reading-style-option="${style.id}" aria-pressed="false"><span>${style.name}</span><small>${style.description}</small></button>`).join('')}</div><p class="settings-note">Inspired styles. Your Markdown stays unchanged.</p><div class="settings-divider"></div><div class="eyebrow">APPEARANCE</div><div class="theme-options">${['light','dark','system'].map((t,i) => `<button data-theme-option="${t}" aria-pressed="false">${icon(['sun','moon','monitor'][i])}<span>${t[0].toUpperCase()+t.slice(1)}</span></button>`).join('')}</div><div class="settings-divider"></div><div class="eyebrow">TINT</div><div class="tint-controls"><label class="tint-picker"><input id="tint-picker" type="color" value="#5776c8" aria-label="Custom tint color" /><span>Custom color<output id="tint-value">Neutral</output></span></label><button id="neutral-tint" class="tint-neutral" aria-pressed="true">Neutral</button></div><div class="tint-swatches" role="group" aria-label="Tint presets">${tintSwatches.map(swatch => `<button class="tint-swatch" data-tint="${swatch.color}" style="--swatch:${swatch.color}" aria-label="${swatch.name} tint" title="${swatch.name}" aria-pressed="false"></button>`).join('')}</div><p class="settings-note">Choose a color for accents and a subtle page tint.</p><div class="settings-divider"></div><div class="size-control"><span>Reading size</span><div><button id="smaller" aria-label="Decrease reading size">A−</button><output id="font-size"></output><button id="larger" aria-label="Increase reading size">A+</button></div></div><button id="reset-size" class="reset-button">Reset to default</button><div id="editor-settings" hidden><div class="settings-divider"></div><div class="eyebrow">EXTERNAL EDITOR</div><button id="choose-editor" class="editor-choice"><span id="editor-name">Choose an editor…</span>${icon('open')}</button><p class="settings-note">Save there. SlayDown refreshes here.</p></div></div>
  <section id="linux-settings" class="linux-settings" hidden aria-label="Linux integration"><div class="eyebrow">LINUX INTEGRATION</div><p id="linux-status" role="status"></p><label><input type="checkbox" id="linux-preview-enabled" /> Space-bar preview in Files</label><pre id="linux-install-command" hidden></pre><div class="linux-actions"><button id="linux-default" class="small-button">Use SlayDown for Markdown</button><button id="linux-retry" class="small-button">Check again</button></div></section>
  <div id="drop-overlay" class="drop-overlay" hidden><div>${icon('open')}<h2>A good place for your words.</h2><p>Drop a Markdown file to start reading.</p></div></div>
  <div id="toast" class="toast" role="status" hidden></div>
  <input id="file-input" type="file" accept=".md,.markdown,.mdown,.mkd,text/markdown" hidden />
`;

$('#settings').append($('#linux-settings'));
interface LinuxIntegration { defaultReader: boolean; previewEnabled: boolean; previewReady: boolean; message: string; installCommand: string | null }
let linuxBusy = false;
async function setupLinux(makeDefault = false, previewEnabled: boolean | null = null) {
  if (linuxBusy) return;
  linuxBusy = true;
  for (const id of ['linux-default', 'linux-retry', 'linux-preview-enabled']) $("#" + id).toggleAttribute('disabled', true);
  try {
    const status = await native<LinuxIntegration | null>('setup_linux_integration', { makeDefault, previewEnabled });
    if (!status) return;
    $('#linux-settings').hidden = false;
    $('#linux-status').textContent = status.message;
    $<HTMLInputElement>('#linux-preview-enabled').checked = status.previewEnabled;
    $('#linux-install-command').hidden = !status.installCommand;
    $('#linux-install-command').textContent = status.installCommand || '';
    $('#linux-default').hidden = status.defaultReader;
    if (status.previewEnabled && !status.previewReady) notify('Space-bar preview needs setup. Open Appearance → Linux integration.');
  } catch (error) {
    $('#linux-settings').hidden = false;
    $('#linux-status').textContent = String(error);
    notify('Linux setup needs attention. Open Appearance → Linux integration.');
  } finally {
    linuxBusy = false;
    for (const id of ['linux-default', 'linux-retry', 'linux-preview-enabled']) $("#" + id).removeAttribute('disabled');
  }
}
$('#linux-default').addEventListener('click', () => { void setupLinux(true); });
$('#linux-retry').addEventListener('click', () => { void setupLinux(); });
$('#linux-preview-enabled').addEventListener('change', () => { void setupLinux(false, $<HTMLInputElement>('#linux-preview-enabled').checked); });

function settings(persist = true) {
  scrollIntent++;
  const position = capturePosition($('#reading-scroll'), sourceMode ? $('#source-content') : $('#reader'));
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.readingStyle = readingStyle;
  applyTint(document.documentElement, tint);
  if (tint) ($<HTMLInputElement>('#tint-picker')).value = tint;
  $('#tint-value').textContent = tint ? tint.toUpperCase() : 'Neutral';
  $('#neutral-tint').setAttribute('aria-pressed', String(tint === null));
  document.querySelectorAll<HTMLButtonElement>('[data-tint]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.tint === tint)));
  document.documentElement.style.setProperty('--reading-size', `${fontSize}px`);
  $('#font-size').textContent = `${fontSize}`;
  document.querySelectorAll<HTMLButtonElement>('[data-theme-option]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.themeOption === theme)));
  document.querySelectorAll<HTMLButtonElement>('[data-reading-style-option]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.readingStyleOption === readingStyle)));
  restorePosition($('#reading-scroll'), sourceMode ? $('#source-content') : $('#reader'), position);
  $('#smaller').toggleAttribute('disabled', fontSize <= 14);
  $('#larger').toggleAttribute('disabled', fontSize >= 23);
  if (!persist || !appearanceReady) return;
  const value = { theme, fontSize, readingStyle, tint };
  appearanceRevision++;
  if (isDesktop) {
    appearancePending++;
    appearanceQueue = appearanceQueue.then(async () => {
      try { await native('set_appearance', { settings: value }); }
      catch (error) { notify(String(error)); }
      finally { appearancePending--; }
    });
  }
  try { localStorage.setItem('folio:settings', JSON.stringify(value)); } catch { /* Optional. */ }
}
function notify(message: string) {
  const toast = $('#toast'); toast.textContent = message; toast.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.hidden = true; }, 5500);
}
async function attempt(action: () => Promise<unknown>) {
  try { await action(); } catch (error) { notify(error instanceof Error ? error.message : String(error)); }
}
function updateDocumentControls() {
  const empty = current === null;
  $('#empty-state').hidden = !empty;
  $('.reading-wrap').hidden = empty;
  $('#document-stats').hidden = empty;
  for (const id of ['#close-document', '#source', '#find']) $(id).toggleAttribute('disabled', empty);
  updateEditor();
}
function closeDocument() {
  if (!current) return;
  const path = current.path;
  selection++; refreshRequest++; sequence++; scrollIntent++;
  clearTimeout(refreshTimer);
  clearMatches();
  current = null; sourceMode = false; activeHeading = '';
  $('#searchbar').hidden = true;
  $<HTMLInputElement>('#search-input').value = '';
  $('#search-count').textContent = '';
  $('#filename').textContent = 'No document open';
  document.title = 'SlayDown';
  $('#sample-badge').hidden = true;
  $('#reader').replaceChildren();
  $('#source-content').textContent = '';
  $('#outline').innerHTML = '<p class="outline-empty">Open a file to see its outline.</p>';
  $('#file-status').textContent = 'Ready to read';
  $('#reload').hidden = true;
  $('#word-count').textContent = ''; $('#reading-time').textContent = '';
  $('#reading-progress').textContent = '';
  updateDocumentControls(); updateView();
  scrollInstantly($('#reading-scroll'), 0);
  $('#empty-open').focus();
  if (desktopReady) void syncWatch();
  if (isDesktop && path !== demo.path) void attempt(() => native('close_document', { path }));
}
async function showDocument(doc: MarkdownDocument, preservePosition = false) {
  const position = preservePosition ? capturePosition($('#reading-scroll'), sourceMode ? $('#source-content') : $('#reader')) : null;
  const intent = scrollIntent;
  if (!preservePosition) { selection++; refreshRequest++; clearTimeout(refreshTimer); }
  current = doc; const ownSequence = ++sequence;
  const restore = () => {
    if (position && sequence === ownSequence && scrollIntent === intent) restorePosition($('#reading-scroll'), sourceMode ? $('#source-content') : $('#reader'), position);
  };
  const rendered = renderMarkdown(doc.content);
  $('#filename').textContent = doc.name;
  document.title = `${doc.name} — SlayDown`;
  $('#sample-badge').hidden = doc.path !== demo.path;
  $('#document-kicker').textContent = doc.path === demo.path ? 'A QUIETER WAY TO READ' : 'YOUR WORDS, WITH ROOM TO BREATHE';
  $('#reader').innerHTML = rendered.html;
  $('#source-content').textContent = doc.content;
  $('#word-count').textContent = `${rendered.wordCount.toLocaleString()} words`;
  $('#reading-time').textContent = `${rendered.readingMinutes} min read`;
  $('#file-status').textContent = doc.path === demo.path ? 'Sample document' : isDesktop ? (watchHealthy ? 'Live preview' : 'Refresh paused') : 'Read only';
  updateEditor();
  $('#reload').hidden = !isDesktop || doc.path === demo.path;
  $('#outline').innerHTML = rendered.headings.length ? rendered.headings.map(h => `<a href="#${escape(h.id)}" data-heading="${escape(h.id)}" style="--level:${Math.min(h.level-1,3)}">${escape(h.text)}</a>`).join('') : '<p class="outline-empty">Headings will appear here.</p>';
  updateDocumentControls(); updateView();
  if (position) restore(); else scrollInstantly($('#reading-scroll'), 0);
  activeHeading = ''; updateScroll();
  if (!preservePosition && desktopReady) void syncWatch();
  if (isDesktop && doc.path !== demo.path) {
    const placeholders = [...$('#reader').querySelectorAll<HTMLElement>('[data-image-path]')];
    // Resolve one image at a time and share repeated paths. Bound the document's
    // aggregate image memory as well as the native per-file limit.
    const images = new Map<string, string>();
    let imageBytes = 0;
    for (const placeholder of placeholders.slice(0, 64)) {
      if (sequence !== ownSequence || imageBytes > 32 * 1024 * 1024) break;
      const relativePath = placeholder.dataset.imagePath!;
      try {
        const data = images.get(relativePath) ?? await native<string>('read_image', { documentPath: doc.path, relativePath });
        if (sequence !== ownSequence) return;
        if (!images.has(relativePath)) { imageBytes += data.length; images.set(relativePath, data); }
        if (imageBytes > 32 * 1024 * 1024) break;
        const image = document.createElement('img'); image.src = data; image.alt = placeholder.getAttribute('aria-label') || ''; image.loading = 'lazy';
        image.addEventListener('load', restore, { once: true });
        placeholder.replaceWith(image);
        restore();
      } catch { placeholder.title = 'This image could not be read. Local images must be inside the document’s folder.'; }
    }
  }
}
function updateEditor() {
  $('#edit-external').hidden = !isDesktop;
  $('#editor-divider').hidden = !isDesktop;
  $('#editor-settings').hidden = !isDesktop;
  $('#edit-external').toggleAttribute('disabled', !editorReady || editorBusy || !current || current.path === demo.path);
  $('#choose-editor').toggleAttribute('disabled', !editorReady || editorBusy);
  $('#editor-name').textContent = preferredEditor?.name || 'Choose an editor…';
  $('#editor-name').title = preferredEditor?.path || '';
  $('#edit-external').title = preferredEditor ? `Open in ${preferredEditor.name} (⌘⇧E / Ctrl+Shift+E)` : 'Choose an editor and open this document';
}
async function chooseEditor() {
  if (!isDesktop || !editorReady || editorBusy) return;
  editorBusy = true; updateEditor();
  try { const editor = await native<EditorInfo | null>('choose_editor'); if (editor) preferredEditor = editor; }
  finally { editorBusy = false; updateEditor(); }
}
async function editExternally() {
  if (!isDesktop || !editorReady || !current || current.path === demo.path || editorBusy) return;
  const path = current.path; const selected = selection;
  if (!preferredEditor) await chooseEditor();
  if (!preferredEditor || selected !== selection) return;
  editorBusy = true; updateEditor();
  try { preferredEditor = await native<EditorInfo>('open_in_editor', { path }); }
  finally { editorBusy = false; updateEditor(); }
}
function syncWatch() {
  const path = !current || current.path === demo.path ? null : current.path;
  const selected = selection;
  // Queue native replacements so a slower previous request cannot reselect an old file.
  watchQueue = watchQueue.then(async () => {
    if (selected !== selection) return;
    try {
      await native('watch_document', { path });
      if (selected !== selection) return;
      watchHealthy = true;
      if (path) { $('#file-status').textContent = 'Live preview'; void refreshDocument(true); }
    } catch (error) {
      if (selected !== selection) return;
      watchHealthy = false; $('#file-status').textContent = 'Refresh paused';
      notify(`Automatic refresh is unavailable. ${String(error)}`);
    }
  });
  return watchQueue;
}
async function refreshDocument(quiet = false) {
  if (!isDesktop || !current || current.path === demo.path) return;
  const path = current.path; const selected = selection; const request = ++refreshRequest;
  const stillCurrent = () => selected === selection && path === current?.path && request === refreshRequest;
  for (let retry = 0; retry < 3; retry++) {
    try {
      const doc = await native<MarkdownDocument>('reload_document', { path });
      if (!stillCurrent()) return;
      if (doc.content !== current?.content) await showDocument(doc, true);
      if (!stillCurrent()) return;
      $('#file-status').textContent = watchHealthy ? 'Live preview' : 'Refresh paused';
      if (!quiet) notify('Updated from disk.');
      return;
    } catch (error) {
      if (!stillCurrent()) return;
      if (retry < 2) { await new Promise(resolve => setTimeout(resolve, 200 * (retry + 1))); if (!stillCurrent()) return; continue; }
      $('#file-status').textContent = 'File unavailable';
      notify(`Keeping the last preview. ${String(error)}`);
    }
  }
}
function scheduleRefresh(path: string) {
  if (path !== current?.path) return;
  clearTimeout(refreshTimer);
  const selected = selection;
  refreshTimer = setTimeout(() => { if (selected === selection) void refreshDocument(true); }, 100);
}
function updateView() {
  $('#reader').hidden = sourceMode; $('#source-content').hidden = !sourceMode;
  $('#source').setAttribute('aria-pressed', String(sourceMode));
  $('#view-label').textContent = !current ? 'Ready when you are' : sourceMode ? 'Markdown source' : 'Reading view';
  if (!$('#searchbar').hidden) search();
}
async function openDocument() {
  if (isDesktop) { const doc = await native<MarkdownDocument | null>('open_document'); if (doc) await showDocument(doc); }
  else $('#file-input').click();
}
function updateScroll() {
  if (!current) return;
  const scroll = $('#reading-scroll');
  const total = scroll.scrollHeight - scroll.clientHeight;
  $('#reading-progress').textContent = `${total > 0 ? Math.round(scroll.scrollTop / total * 100) : 100}%`;
  const headings = [...$('#reader').querySelectorAll<HTMLElement>('h1[id],h2[id],h3[id],h4[id],h5[id],h6[id]')];
  let next = headings[0]?.id || '';
  for (const heading of headings) { if (heading.getBoundingClientRect().top <= scroll.getBoundingClientRect().top + 100) next = heading.id; }
  if (next !== activeHeading) {
    activeHeading = next;
    $('#outline').querySelectorAll<HTMLElement>('a').forEach(link => { if (link.dataset.heading === next) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current'); });
  }
}
function clearMatches() {
  searchMatches.forEach(mark => mark.replaceWith(document.createTextNode(mark.textContent || '')));
  $('#reader').normalize(); $('#source-content').normalize(); searchMatches = [];
}
function search() {
  clearMatches(); searchIndex = 0;
  const query = $('#search-input') as HTMLInputElement;
  if (query.value.trim()) {
    const root = sourceMode ? $('#source-content') : $('#reader');
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: node => node.parentElement?.closest('script,style') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
    const nodes: Text[] = []; while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    const needle = query.value.toLocaleLowerCase();
    for (const node of nodes) {
      const text = node.textContent || ''; const haystack = text.toLocaleLowerCase();
      let index = 0; let match = haystack.indexOf(needle); if (match < 0) continue;
      const fragment = document.createDocumentFragment();
      while (match >= 0) {
        fragment.append(text.slice(index, match)); const mark = document.createElement('mark'); mark.className = 'search-match'; mark.textContent = text.slice(match, match + needle.length); fragment.append(mark); searchMatches.push(mark);
        index = match + needle.length; match = haystack.indexOf(needle,index);
        if (searchMatches.length >= 3000) break;
      }
      fragment.append(text.slice(index)); node.replaceWith(fragment);
      if (searchMatches.length >= 3000) break;
    }
  }
  selectMatch(false);
}
function selectMatch(scroll = true) {
  searchMatches.forEach((mark, i) => mark.classList.toggle('current-match', i === searchIndex));
  const hasQuery = !!($('#search-input') as HTMLInputElement).value.trim();
  $('#search-count').textContent = searchMatches.length ? `${searchIndex+1} of ${searchMatches.length}${searchMatches.length >= 3000 ? '+' : ''}` : hasQuery ? 'No matches' : '';
  $('#next-match').toggleAttribute('disabled', !searchMatches.length); $('#previous-match').toggleAttribute('disabled', !searchMatches.length);
  if (scroll) scrollIntent++;
  if (scroll) searchMatches[searchIndex]?.scrollIntoView({ block: 'center', behavior: 'smooth' });
}
function find() { if (!current) return; scrollIntent++; $('#searchbar').hidden = false; search(); ($('#search-input') as HTMLInputElement).focus(); ($('#search-input') as HTMLInputElement).select(); }
function closeFind() { scrollIntent++; $('#searchbar').hidden = true; clearMatches(); $('#find').focus(); }
function moveMatch(direction: number) { if (searchMatches.length) { searchIndex = (searchIndex + direction + searchMatches.length) % searchMatches.length; selectMatch(); } }
function toggleSettings() { const panel = $('#settings'); panel.hidden = !panel.hidden; for (const id of ['#appearance','#type']) $(id).setAttribute('aria-expanded',String(!panel.hidden)); }
function closeSettings() { $('#settings').hidden = true; for (const id of ['#appearance','#type']) $(id).setAttribute('aria-expanded','false'); }

for (const id of ['#open', '#empty-open']) $(id).addEventListener('click', () => attempt(openDocument));
$('#close-document').addEventListener('click', closeDocument);
$('#file-input').addEventListener('change', () => { const input = $('#file-input') as HTMLInputElement; const file = input.files?.[0]; if (file) void attempt(async () => showDocument(await documentFromFile(file))); input.value = ''; });
$('#outline').addEventListener('click', event => { const link = (event.target as Element).closest<HTMLAnchorElement>('a'); if (!link) return; event.preventDefault(); scrollIntent++; if (sourceMode) { sourceMode = false; updateView(); } document.getElementById(link.dataset.heading!)?.scrollIntoView({ block: 'start', behavior: 'smooth' }); });
$('#reader').addEventListener('click', event => {
  const link = (event.target as Element).closest<HTMLAnchorElement>('a'); if (!link) return;
  event.preventDefault(); scrollIntent++; const href = link.getAttribute('href') || '';
  if (href.startsWith('#')) { try { document.getElementById(decodeURIComponent(href.slice(1)))?.scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch { /* Invalid fragment. */ } }
  else if (/^(https?:|mailto:)/i.test(href)) void attempt(() => openLink(href));
  else notify('Open linked Markdown files with the Open a file button.');
});
$('#toggle-sidebar').addEventListener('click', () => { scrollIntent++; const hidden = $('#app').classList.toggle('sidebar-hidden'); $('#toggle-sidebar').setAttribute('aria-expanded',String(!hidden)); });
$('#source').addEventListener('click', () => { scrollIntent++; sourceMode = !sourceMode; updateView(); });
$('#find').addEventListener('click', find);
$('#close-find').addEventListener('click', closeFind);
$('#search-input').addEventListener('input', search);
$('#search-input').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); moveMatch(event.shiftKey ? -1 : 1); } });
$('#previous-match').addEventListener('click', () => moveMatch(-1)); $('#next-match').addEventListener('click', () => moveMatch(1));
$('#appearance').addEventListener('click', toggleSettings); $('#type').addEventListener('click', toggleSettings);
$('#settings').addEventListener('click', event => { const style = (event.target as Element).closest<HTMLElement>('[data-reading-style-option]')?.dataset.readingStyleOption; if (readingStyles.some(item => item.id === style)) { readingStyle = style!; settings(); } const option = (event.target as Element).closest<HTMLElement>('[data-theme-option]')?.dataset.themeOption; if (option) { theme = option as typeof theme; settings(); } });
$('#smaller').addEventListener('click', () => { fontSize = Math.max(14,fontSize-1); settings(); });
$('#larger').addEventListener('click', () => { fontSize = Math.min(23,fontSize+1); settings(); });
for (const event of ['input', 'change']) $('#tint-picker').addEventListener(event, () => {
  tint = normalizeTint($<HTMLInputElement>('#tint-picker').value); settings();
});
$('#neutral-tint').addEventListener('click', () => { tint = null; settings(); });
$('.tint-swatches').addEventListener('click', event => {
  const color = (event.target as Element).closest<HTMLElement>('[data-tint]')?.dataset.tint;
  if (color) { tint = normalizeTint(color); settings(); }
});
$('#reset-size').addEventListener('click', () => { fontSize = 17; settings(); });
$('#reload').addEventListener('click', () => { void refreshDocument(); });
$('#edit-external').addEventListener('click', () => attempt(editExternally));
$('#choose-editor').addEventListener('click', () => attempt(chooseEditor));
for (const event of ['wheel', 'touchmove', 'pointerdown']) $('#reading-scroll').addEventListener(event, () => { scrollIntent++; }, { passive: true });
$('#reading-scroll').addEventListener('scroll', updateScroll, { passive: true });
document.addEventListener('click', event => { if (!(event.target as Element).closest('#settings,#appearance,#type')) closeSettings(); });
document.addEventListener('keydown', event => {
  const mod = event.metaKey || event.ctrlKey;
  if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) scrollIntent++;
  if (mod && event.shiftKey && event.key.toLowerCase() === 'e') { event.preventDefault(); void attempt(editExternally); }
  if (!isDesktop && mod && event.key.toLowerCase() === 'o') { event.preventDefault(); void attempt(openDocument); }
  if (!isDesktop && mod && !event.shiftKey && event.key.toLowerCase() === 'w') { event.preventDefault(); closeDocument(); }
  if (mod && event.key.toLowerCase() === 'f') { event.preventDefault(); find(); }
  if (event.key === 'Escape') { closeSettings(); if (!$('#searchbar').hidden) closeFind(); }
  if (mod && ['+','=','-','0'].includes(event.key)) { event.preventDefault(); fontSize = event.key === '0' ? 17 : Math.max(14,Math.min(23,fontSize + (event.key === '-' ? -1 : 1))); settings(); }
});
let dragDepth = 0;
if (!isDesktop) {
  document.addEventListener('dragenter', event => { event.preventDefault(); if (event.dataTransfer?.types.includes('Files')) { dragDepth++; $('#drop-overlay').hidden = false; } });
  document.addEventListener('dragover', event => event.preventDefault());
  document.addEventListener('dragleave', event => { event.preventDefault(); dragDepth = Math.max(0,dragDepth-1); if (!dragDepth) $('#drop-overlay').hidden = true; });
  document.addEventListener('drop', event => { event.preventDefault(); dragDepth = 0; $('#drop-overlay').hidden = true; const file = event.dataTransfer?.files[0]; if (file) void attempt(async () => showDocument(await documentFromFile(file))); });
}
if (!/Mac|iPhone|iPad/.test(navigator.platform)) $('#open-key').textContent = 'Ctrl O';
settings(false); void showDocument(demo);
if (isDesktop) void attempt(async () => {
  try {
    const saved = await native<Appearance>('get_appearance', { legacy: legacyAppearance });
    if (saved) assignAppearance(saved);
    settings(false);
    appearanceReady = true;
  } catch (error) { notify(String(error)); appearanceReady = true; }
  finally { document.documentElement.style.visibility = ''; }
  let appearanceLoading = false;
  const syncAppearance = async () => {
    if (appearancePending || appearanceLoading) return;
    appearanceLoading = true;
    const revision = appearanceRevision;
    try {
      const saved = await native<Appearance>('get_appearance', { legacy: null });
      if (saved && !appearancePending && revision === appearanceRevision && JSON.stringify(saved) !== JSON.stringify(normalizeAppearance({ theme, fontSize, readingStyle, tint }))) {
        assignAppearance(saved); settings(false);
      }
    } catch (error) { notify(String(error)); }
    finally { appearanceLoading = false; }
  };
  window.addEventListener('focus', () => { void syncAppearance(); });
  setInterval(() => { if (!document.hidden) void syncAppearance(); }, 2000);
  const bootSelection = selection;
  const { listen } = await import('@tauri-apps/api/event');
  await listen<MarkdownDocument>('document-opened', event => { void showDocument(event.payload); });
  await listen('document-close-requested', closeDocument);
  await listen('document-open-requested', () => { void attempt(openDocument); });
  await listen<string>('document-error', event => notify(event.payload));
  await listen<string>('document-changed', event => scheduleRefresh(event.payload));
  await listen<{path: string; message: string}>('document-watch-error', event => {
    if (event.payload.path === current?.path) { watchHealthy = false; $('#file-status').textContent = 'Refresh paused'; notify(event.payload.message); }
  });
  const { getCurrentWebview } = await import('@tauri-apps/api/webview');
  await getCurrentWebview().onDragDropEvent(event => {
    $('#drop-overlay').hidden = event.payload.type !== 'over';
    if (event.payload.type === 'drop' && event.payload.paths[0]) void attempt(async () => showDocument(await native<MarkdownDocument>('open_path',{path:event.payload.type === 'drop' ? event.payload.paths[0] : ''})));
  });
  desktopReady = true;
  window.addEventListener('focus', () => { if (watchHealthy) void refreshDocument(true); else void syncWatch(); });
  const initial = await native<MarkdownDocument | null>('get_initial_document');
  if (initial && selection === bootSelection) await showDocument(initial); else await syncWatch();
  await attempt(async () => { preferredEditor = await native<EditorInfo | null>('get_editor'); });
  editorReady = true; updateEditor();
  void setupLinux();
});
