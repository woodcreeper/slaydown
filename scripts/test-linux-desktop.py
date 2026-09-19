#!/usr/bin/env python3
"""Exercise real GIO associations in an isolated profile; never touch user defaults."""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("repair", ROOT / "preview/linux/repair-desktop.py")
repair = importlib.util.module_from_spec(spec)
spec.loader.exec_module(repair)


@unittest.skipUnless(sys.platform == "linux", "GIO desktop associations require Linux")
class DesktopRepairTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.data = self.root / "data"
        self.apps = self.data / "applications"
        self.apps.mkdir(parents=True)
        self.env = dict(os.environ, XDG_DATA_HOME=str(self.data), XDG_CONFIG_HOME=str(self.root / "config"), XDG_CURRENT_DESKTOP="GNOME")
        self.output = self.root / "opened.json"
        self.binary = self.root / 'SlayDown Ω %f $HOME `id` "test" \\.AppImage'
        self.binary.write_text(f'''#!{sys.executable}
import json, sys
from pathlib import Path
if sys.argv[1:] == ['--preview-appearance']:
    print('{{"style":"omarchy"}}')
else:
    Path({str(self.output)!r}).write_text(json.dumps(sys.argv[1:]))
''')
        self.binary.chmod(0o755)
        adapter = self.data / "sushi/viewers/slaydown.js"
        adapter.parent.mkdir(parents=True)
        adapter.write_text(f"const BINARY = {json.dumps(str(self.binary))};\n")
        for name in ("Folio", "OtherEditor"):
            (self.apps / f"{name}.desktop").write_text(f"[Desktop Entry]\nType=Application\nName={name}\nExec=/bin/true %f\nMimeType=text/markdown;text/plain;\n")
        self.run_command("update-desktop-database", str(self.apps))
        self.run_command("gio", "mime", "text/markdown", "Folio.desktop")
        self.run_command("gio", "mime", "text/plain", "OtherEditor.desktop")

    def run_command(self, *argv, check=True):
        result = subprocess.run(argv, env=self.env, text=True, capture_output=True)
        if check and result.returncode:
            self.fail(f"{argv!r} exited {result.returncode}\n{result.stdout}\n{result.stderr}")
        return result

    def test_migration_launch_and_idempotence(self):
        script = str(ROOT / "preview/linux/repair-desktop.py")
        first = self.run_command(sys.executable, script)
        self.assertIn("Markdown now opens in SlayDown", first.stdout)
        desktop = self.apps / "SlayDown.desktop"
        content = desktop.read_text()
        self.run_command("desktop-file-validate", str(desktop))
        self.run_command(sys.executable, script)
        self.assertEqual(content, desktop.read_text())
        # Native default-launch must pass one exact filename, with no shell expansion.
        document = self.root / 'notes Ω %u $HOME "quoted".md'
        document.write_text("# Preview\n")
        code = '''const Gio = imports.gi.Gio;
const app = Gio.AppInfo.get_default_for_type('text/markdown', false);
app.launch([Gio.File.new_for_path(ARGV[0])], null);
const plain = Gio.AppInfo.get_default_for_type('text/plain', false);
if (plain.get_id() !== 'OtherEditor.desktop') throw new Error('Changed plain-text default');'''
        self.run_command("gjs", "-c", code, str(document))
        for _ in range(50):
            if self.output.exists():
                break
            time.sleep(.05)
        self.assertEqual(json.loads(self.output.read_text()), [str(document)])
        self.assertTrue((self.apps / "Folio.desktop").exists())

    def test_invalid_binary_preserves_default(self):
        result = self.run_command(sys.executable, str(ROOT / "preview/linux/repair-desktop.py"), "/bin/false", check=False)
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse((self.apps / "SlayDown.desktop").exists())
        self.assertIn("Folio.desktop", self.run_command("gio", "mime", "text/markdown").stdout)

    def test_missing_sushi_reports_install_command(self):
        commands = self.root / "bin"
        commands.mkdir()
        pacman = commands / "pacman"
        pacman.write_text("#!/bin/sh\nexit 1\n")
        pacman.chmod(0o755)
        # Empty version from both supported package managers.
        dpkg = commands / "dpkg-query"
        dpkg.write_text("#!/bin/sh\nexit 1\n")
        dpkg.chmod(0o755)
        self.env["PATH"] = str(commands) + os.pathsep + self.env["PATH"]
        result = self.run_command("bash", str(ROOT / "preview/linux/install.sh"), str(self.binary), check=False)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("sudo pacman -S --needed sushi", result.stderr)


if __name__ == "__main__":
    unittest.main()
