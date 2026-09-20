import { existsSync } from 'node:fs';
import { resolve, delimiter } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const env = { ...process.env };
if (existsSync(resolve(root, '.tools/cargo/bin'))) {
  env.CARGO_HOME = resolve(root, '.tools/cargo');
  env.RUSTUP_HOME = resolve(root, '.tools/rustup');
  env.PATH = `${resolve(root, '.tools/cargo/bin')}${delimiter}${env.PATH}`;
}
const args = process.argv.slice(2);
const cli = resolve(root, 'node_modules/@tauri-apps/cli/tauri.js');
if (process.platform === 'linux' && ['build', 'dev'].includes(args[0])) {
  const result = spawnSync(process.execPath, ['scripts/build-linux-preview.mjs'], { cwd: root, env, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
  args.push('--config', 'src-tauri/tauri.linux.conf.json');
}
if (args[0] === 'build' && process.platform === 'darwin') {
  for (const command of [[process.execPath, [resolve(root, 'node_modules/vite/bin/vite.js'), 'build', '--config', 'vite.renderer.config.ts']], [process.execPath, ['scripts/copy-reader.mjs']], ['bash', ['scripts/build-quicklook.sh', '--test']]]) {
    const result = spawnSync(command[0], command[1], { cwd:root, env, stdio:'inherit' });
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
  args.push('--config', 'src-tauri/tauri.quicklook.conf.json');
}
const result = spawnSync(process.execPath, [cli, ...args], { cwd:root, env, stdio:'inherit' });
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
