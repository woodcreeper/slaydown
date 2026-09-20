// Real GIO + released native lifecycle, isolated from the runner's preferences.
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, chmodSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
const binary = resolve(process.argv[2]);
const root = mkdtempSync(join(tmpdir(), 'slaydown-lifecycle-'));
const data = join(root, 'data'), config = join(root, 'config'), apps = join(data, 'applications');
mkdirSync(apps, { recursive: true }); mkdirSync(config);
const env = { ...process.env, XDG_DATA_HOME: data, XDG_CONFIG_HOME: config, XDG_CURRENT_DESKTOP: 'GNOME' };
const run = (cmd, args, extra = {}) => {
  const result = spawnSync(cmd, args, { env: { ...env, ...extra }, encoding: 'utf8', timeout: 20000 });
  assert.equal(result.status, 0, `${cmd} ${args.join(' ')}: ${result.error || result.stderr}`);
  return result.stdout.trim();
};
const setup = (args = [], extra = {}) => JSON.parse(run(binary, ['--linux-integrate', ...args], extra));
const defaultFor = mime => run('gjs', ['-c', `const app=imports.gi.Gio.AppInfo.get_default_for_type(ARGV[0],false); print(app ? app.get_id() : 'none');`, mime]);
const defaults = value => writeFileSync(join(config, 'mimeapps.list'), `[Default Applications]\ntext/markdown=${value};\ntext/x-markdown=${value};\ntext/plain=OtherEditor.desktop;\n`);
try {
  for (const name of ['Folio', 'OtherEditor']) writeFileSync(join(apps, `${name}.desktop`), `[Desktop Entry]\nType=Application\nName=${name}\nExec=/bin/true %f\nMimeType=text/markdown;text/x-markdown;text/plain;\n`);
  run('update-desktop-database', [apps]);
  defaults('Folio.desktop');
  let status = setup();
  assert.equal(status.defaultReader, true);
  assert.equal(defaultFor('text/markdown'), 'SlayDown.desktop');
  assert.equal(defaultFor('text/plain'), 'OtherEditor.desktop');
  assert.ok(readFileSync(join(apps, 'SlayDown.desktop'), 'utf8').includes('%f'));

  // Existing editor choices survive every later launch, even after migration.
  defaults('OtherEditor.desktop');
  status = setup();
  assert.equal(status.defaultReader, false);
  assert.equal(defaultFor('text/markdown'), 'OtherEditor.desktop');
  assert.equal(setup(['--set-default']).defaultReader, true);

  // Deleted Folio still appears in mimeapps.list: GIO alone would skip it.
  rmSync(join(apps, 'Folio.desktop'));
  defaults('Folio.desktop');
  assert.equal(setup().defaultReader, true);

  // A replaced/moved AppImage updates the permanent launcher and adapter.
  const image = join(root, 'SlayDown Ω %f $HOME "new".AppImage');
  const opened = join(root, 'opened.json');
  writeFileSync(image, `#!/usr/bin/python3\nimport json,sys\nfrom pathlib import Path\nPath(${JSON.stringify(opened)}).write_text(json.dumps(sys.argv[1:]))\n`); chmodSync(image, 0o755);
  setup([], { APPIMAGE: image });
  const desktop = readFileSync(join(apps, 'SlayDown.desktop'), 'utf8');
  assert.ok(desktop.includes('SlayDown Ω %%f'));
  run('desktop-file-validate', [join(apps, 'SlayDown.desktop')]);
  const modified = statSync(join(apps, 'SlayDown.desktop')).mtimeMs;
  assert.equal(setup([], { APPIMAGE: image }).defaultReader, true);
  assert.equal(statSync(join(apps, 'SlayDown.desktop')).mtimeMs, modified);
  const document = join(root, 'notes Ω %f "file".md'); writeFileSync(document, '# Markdown');
  run('gjs', ['-c', `const Gio=imports.gi.Gio; Gio.AppInfo.get_default_for_type('text/markdown',false).launch([Gio.File.new_for_path(ARGV[0])],null);`, document]);
  for (let attempt = 0; attempt < 50 && !existsSync(opened); attempt++) await new Promise(resolve => setTimeout(resolve, 50));
  assert.deepEqual(JSON.parse(readFileSync(opened, 'utf8')), [document]);

  // Disabling survives restart and leaves unrelated Sushi viewers untouched.
  const viewers = join(data, 'sushi/viewers'); mkdirSync(viewers, { recursive: true });
  writeFileSync(join(viewers, 'unrelated.js'), 'keep');
  status = setup(['--disable-preview']);
  assert.equal(status.previewEnabled, false);
  assert.equal(setup().previewEnabled, false);
  assert.ok(!existsSync(join(viewers, 'slaydown.js')));
  assert.equal(readFileSync(join(viewers, 'unrelated.js'), 'utf8'), 'keep');
  status = setup(['--enable-preview']);
  assert.equal(status.previewEnabled, true);
  // On the Sushi runtime runner this also proves the adapter ships in the app.
  if (process.env.SLAYDOWN_EXPECT_SUSHI === '1') {
    assert.equal(status.previewReady, true, status.message);
    assert.ok(existsSync(join(viewers, 'slaydown.js')) || existsSync(join(data, 'sushi/plugins-1/slaydown.js')));
  }
  const bin = join(root, 'bin'); mkdirSync(bin);
  for (const name of ['pacman', 'dpkg-query']) { const path = join(bin, name); writeFileSync(path, '#!/bin/sh\nexit 1\n'); chmodSync(path, 0o755); }
  const missing = setup([], { PATH: `${bin}:${env.PATH}` });
  assert.equal(missing.previewReady, false);
  assert.match(missing.message, /needs Sushi/);
  assert.match(missing.installCommand, /sushi/);
  console.log('Linux lifecycle passed: Folio migration, deleted app, editor preservation, AppImage move, persistent opt-out, bundled adapter.');
} finally { rmSync(root, { recursive: true, force: true }); }
