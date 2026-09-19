import { readFileSync, writeFileSync } from 'node:fs';
const js = readFileSync('dist-preview/preview.js', 'utf8');
const css = readFileSync('dist-preview/preview.css', 'utf8');
if (/<\/script/i.test(js) || /<\/style/i.test(css)) throw new Error('Unsafe inline asset delimiter');
writeFileSync('dist-preview/preview.html', `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; base-uri 'none'; form-action 'none'; frame-src 'none'; connect-src 'none'"><title>SlayDown Preview</title><style>${css}</style></head><body><script id="preview-data" type="application/json">__SLAYDOWN_PAYLOAD__</script><script>${js}</script></body></html>`);
