import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const script = resolve('scripts/prepare-release.mjs');
const packages = ['SlayDown.zip', 'SlayDown.exe', 'SlayDown.deb', 'SlayDown.AppImage', 'SlayDown.qlplugin', 'SlayDown-Sushi.tar.gz', 'slaydown-markdown-1.2.3-1-x86_64.pkg.tar.zst'];
function fixture(t, includeArch) {
  const root = mkdtempSync(join(tmpdir(), 'slaydown-release-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'src-tauri'));
  for (const file of ['package.json', 'src-tauri/tauri.conf.json']) writeFileSync(join(root, file), JSON.stringify({ version: '1.2.3' }));
  writeFileSync(join(root, 'src-tauri/Cargo.toml'), 'version = "1.2.3"\n');
  mkdirSync(join(root, 'artifacts/nested'), { recursive: true });
  for (const name of packages.filter(name => includeArch || !name.endsWith('.pkg.tar.zst'))) writeFileSync(join(root, 'artifacts/nested', name), name);
  return root;
}
function prepare(root) {
  return spawnSync(process.execPath, [script], { cwd: root, env: { ...process.env, RELEASE_VERSION: '1.2.3' }, encoding: 'utf8' });
}
test('a release cannot omit the native Arch package', t => {
  const result = prepare(fixture(t, false));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Expected one \.pkg\.tar\.zst package/);
});
test('release includes every package and matching checksums, including Arch', t => {
  const root = fixture(t, true);
  const result = prepare(root);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(readdirSync(join(root, 'release-assets')).sort(), [...packages, 'SHA256SUMS.txt'].sort());
  const sums = readFileSync(join(root, 'release-assets/SHA256SUMS.txt'), 'utf8').trim().split('\n');
  assert.equal(sums.length, packages.length);
  for (const name of packages) {
    const contents = readFileSync(join(root, 'release-assets', name));
    assert.equal(contents.toString(), name);
    assert(sums.includes(`${createHash('sha256').update(contents).digest('hex')}  ${name}`));
  }
});
