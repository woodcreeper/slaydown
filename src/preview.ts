import './reader.css';
import './style.css';
import './preview.css';
import { renderMarkdown } from './renderer';
import { readingStyles, type Appearance } from './appearance';
import { applyTint } from './tint';
import type { MarkdownDocument } from './platform';

type Request = { id: number; action: string; value?: unknown };
type Host = Window & {
  slaydownHost?: { kind: 'sushi'; opensReader: boolean };
  webkit?: { messageHandlers: { slaydown: { postMessage: (value: string) => void } } };
  chrome?: { webview: { postMessage: (value: string) => void } };
  slaydownReply: (id: number, value: unknown, error?: string) => void;
};
const host = window as unknown as Host;
const pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
let next = 0;
function request<T>(action: string, value?: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = ++next;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('The preview host did not respond. Reopen the preview.')); }, 10000);
    pending.set(id, { resolve, reject, timer });
    const message: Request = { id, action, value };
    const bridge = host.webkit?.messageHandlers.slaydown || host.chrome?.webview;
    if (bridge) bridge.postMessage(JSON.stringify(message));
    else { clearTimeout(timer); pending.delete(id); reject(new Error('Open this preview from your file manager.')); }
  });
}
host.slaydownReply = (id, value, error) => {
  const item = pending.get(id); if (!item) return;
  clearTimeout(item.timer); pending.delete(id);
  if (error) item.reject(new Error(error)); else item.resolve(value);
};
const payload = JSON.parse(document.getElementById('preview-data')!.textContent!) as { document: MarkdownDocument; appearance: Appearance };
let appearance = payload.appearance;
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id)! as T;
document.body.insertAdjacentHTML('beforeend', `<header class="preview-bar"><strong>SlayDown</strong><span id="preview-name"></span><button id="appearance-toggle" aria-expanded="false">Appearance</button><button id="open-reader">Open in SlayDown</button></header>
<section id="preview-settings" hidden aria-label="Appearance settings">
<label>Reading style<select id="style">${readingStyles.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}</select></label>
<label>Theme<select id="theme"><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label>
<label>Tint<input id="tint" type="color" aria-label="Custom tint color"></label><button id="neutral">Neutral</button>
<label>Size<input id="size" type="number" min="14" max="23" step="1" aria-label="Reading size"></label>
</section><p id="preview-status" role="status"></p><main id="preview-scroll"><article id="reader" class="markdown-body"></article></main>`);
$('preview-name').textContent = payload.document.name;
if (host.slaydownHost?.kind === 'sushi') {
  document.body.dataset.host = 'sushi';
  $('preview-name').hidden = true;
  $('open-reader').hidden = host.slaydownHost.opensReader === true;
}
$('reader').innerHTML = renderMarkdown(payload.document.content).html;
function apply() {
  document.documentElement.dataset.theme = appearance.theme;
  document.documentElement.dataset.readingStyle = appearance.readingStyle;
  document.documentElement.style.setProperty('--reading-size', `${appearance.fontSize}px`);
  applyTint(document.documentElement, appearance.tint);
  $<HTMLSelectElement>('style').value = appearance.readingStyle;
  $<HTMLSelectElement>('theme').value = appearance.theme;
  $<HTMLInputElement>('tint').value = appearance.tint || '#5776c8';
  $<HTMLInputElement>('size').value = String(appearance.fontSize);
  $('neutral').setAttribute('aria-pressed', String(appearance.tint === null));
}
function report(error: unknown) { $('preview-status').textContent = String(error instanceof Error ? error.message : error); }
let queue = Promise.resolve();
let saving = 0;
let revision = 0;
function save() {
  apply(); revision++; saving++;
  const value = { ...appearance };
  queue = queue.then(async () => {
    try { await request('save', value); $('preview-status').textContent = ''; }
    catch (error) { report(error); }
    finally { saving--; }
  });
}
$('style').onchange = () => { appearance.readingStyle = $<HTMLSelectElement>('style').value; save(); };
$('theme').onchange = () => { appearance.theme = $<HTMLSelectElement>('theme').value as Appearance['theme']; save(); };
$('tint').onchange = () => { appearance.tint = $<HTMLInputElement>('tint').value; save(); };
$('neutral').onclick = () => { appearance.tint = null; save(); };
$('size').onchange = () => { const n = $<HTMLInputElement>('size').valueAsNumber; if (Number.isFinite(n)) { appearance.fontSize = Math.min(23, Math.max(14, n)); save(); } };
$('appearance-toggle').onclick = () => { const panel = $('preview-settings'); panel.hidden = !panel.hidden; $('appearance-toggle').setAttribute('aria-expanded', String(!panel.hidden)); };
$('open-reader').onclick = () => { void request('open').catch(report); };
$('reader').onclick = event => {
  const link = (event.target as Element).closest('a'); if (!link) return;
  event.preventDefault(); const href = link.getAttribute('href') || '';
  if (href.startsWith('#')) { try { document.getElementById(decodeURIComponent(href.slice(1)))?.scrollIntoView(); } catch { /* Invalid fragment. */ } }
  else report('Open in SlayDown to follow external links.');
};
// WebViews consume keys before their native preview host. Return dismissal keys,
// but leave keys in controls alone so appearance remains keyboard accessible.
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !$('preview-settings').hidden) { $('preview-settings').hidden = true; $('appearance-toggle').setAttribute('aria-expanded', 'false'); return; }
  const editing = (event.target as Element).closest('input,select,button');
  if (event.key === 'Escape' || (event.key === ' ' && !editing)) { event.preventDefault(); void request('close').catch(report); }
});
let polling = false;
setInterval(async () => {
  if (saving || polling || document.hidden) return;
  polling = true; const before = revision;
  try {
    const saved = await request<Appearance>('load');
    if (!saving && before === revision && JSON.stringify(saved) !== JSON.stringify(appearance)) { appearance = saved; apply(); }
  } catch (error) { report(error); }
  finally { polling = false; }
}, 2000);
apply();
void request('ready').catch(report);
// Same limits and native path checks as the full reader. Remote images remain inert.
void (async () => {
  let size = 0;
  const cache = new Map<string, string>();
  for (const placeholder of [...$('reader').querySelectorAll<HTMLElement>('[data-image-path]')].slice(0, 64)) {
    const path = placeholder.dataset.imagePath!;
    try {
      const data = cache.get(path) ?? await request<string>('image', path);
      if (!cache.has(path)) { size += data.length; cache.set(path, data); }
      if (size > 32 * 1024 * 1024) break;
      const img = document.createElement('img'); img.src = data; img.alt = placeholder.getAttribute('aria-label') || ''; placeholder.replaceWith(img);
    } catch { placeholder.title = 'This local image could not be read.'; }
  }
})();
