import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
const out = 'build/SlayDown-Sushi';
mkdirSync(out, { recursive: true });
const bridge = readFileSync('preview/linux/bridge.js', 'utf8');
for (const name of ['sushi-legacy.js', 'sushi-modern.js']) writeFileSync(`${out}/${name}`, readFileSync(`preview/linux/${name}`, 'utf8').replace('// @@BRIDGE@@', bridge));
copyFileSync('preview/linux/install.sh', `${out}/install.sh`);
copyFileSync('preview/linux/repair-desktop.py', `${out}/repair-desktop.py`);
copyFileSync('preview/README.md', `${out}/README.md`);
copyFileSync('preview/LICENSE', `${out}/LICENSE`);
