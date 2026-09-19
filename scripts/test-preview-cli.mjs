import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';
if (!['linux', 'win32'].includes(process.platform)) throw new Error('This isolation harness targets Linux and Windows.');
const directory = mkdtempSync(join(tmpdir(), 'slaydown-cli-'));
const binary = resolve(process.argv[2]);
const env = { ...process.env, XDG_CONFIG_HOME: directory, APPDATA: directory };
if (process.platform === 'linux') { env.OMARCHY_PATH = join(directory, 'omarchy'); mkdirSync(env.OMARCHY_PATH); }
function run(args, input) {
  const result = spawnSync(binary, args, { env, input, encoding: 'utf8', timeout: 15000, maxBuffer: 40 * 1024 * 1024, windowsHide: true });
  if (result.error) throw result.error;
  return result;
}
try {
  const initial = run(['--preview-appearance']); assert.equal(initial.status, 0, initial.stderr);
  assert.equal(JSON.parse(initial.stdout).readingStyle, process.platform === 'linux' ? 'omarchy' : 'folio');
  const settings = { theme: 'dark', readingStyle: 'github', tint: '#9365b8', fontSize: 20 };
  assert.equal(run(['--preview-save'], JSON.stringify(settings)).status, 0);
  assert.deepEqual(JSON.parse(run(['--preview-appearance']).stdout), settings);
  const path = join(directory, 'Unicode Ω & quoted notes.md');
  writeFileSync(path, '# Actual preview\n\n</script><script>alert(1)</script>\n');
  const preview = run(['--preview-html', path]); assert.equal(preview.status, 0, preview.stderr);
  assert.ok(preview.stdout.includes('Actual preview'));
  assert.ok(preview.stdout.includes('\\u003c/script\\u003e'));
  assert.ok(!preview.stdout.includes('</script><script>alert(1)'));
  assert.ok(preview.stdout.includes('"readingStyle":"github"'));
  assert.equal(readFileSync(path, 'utf8'), '# Actual preview\n\n</script><script>alert(1)</script>\n');
  assert.notEqual(run(['--preview-save'], '{"theme":"invalid"}').status, 0);
  assert.deepEqual(JSON.parse(run(['--preview-appearance']).stdout), settings);
  assert.notEqual(run(['--preview-image', path, '../private.png']).status, 0);
  assert.notEqual(run(['--preview-html', join(directory, 'missing.md')]).status, 0);
  console.log('Native preview CLI passed: Unicode arguments, persistent preferences, escaped content, errors, and document integrity.');
} finally { rmSync(directory, { recursive: true, force: true }); }
