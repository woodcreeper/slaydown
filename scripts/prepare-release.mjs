import { readdirSync, readFileSync, mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { createHash } from 'node:crypto';
const version = process.env.RELEASE_VERSION;
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const config = JSON.parse(readFileSync('src-tauri/tauri.conf.json', 'utf8'));
const cargoVersion = readFileSync('src-tauri/Cargo.toml', 'utf8').match(/^version = "([^"]+)"/m)?.[1];
if (!/^\d+\.\d+\.\d+$/.test(version ?? '') || version !== pkg.version || version !== config.version || version !== cargoVersion) {
  throw new Error('Release version must match package.json, Cargo.toml, and tauri.conf.json.');
}
function collect(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? collect(path) : /\.(zip|exe|deb|AppImage|qlplugin|tar\.gz)$/.test(entry.name) ? [path] : [];
  });
}
const assets = collect('artifacts').sort();
for (const extension of ['.zip', '.exe', '.deb', '.AppImage', '.qlplugin', '.tar.gz']) {
  if (assets.filter(path => path.endsWith(extension)).length !== 1) throw new Error(`Expected one ${extension} package.`);
}
mkdirSync('release-assets', { recursive: true });
const checksums = assets.map(path => {
  const name = basename(path);
  copyFileSync(path, join('release-assets', name));
  return `${createHash('sha256').update(readFileSync(path)).digest('hex')}  ${name}`;
});
writeFileSync('release-assets/SHA256SUMS.txt', checksums.join('\n') + '\n');
