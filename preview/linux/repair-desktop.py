#!/usr/bin/env python3
"""Register the current SlayDown and make it the default for Markdown only."""
import argparse
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys

DESKTOP_ID = "SlayDown.desktop"
MIME_TYPES = ("text/markdown", "text/x-markdown")


def find_binary(data):
    # The working preview knows the exact AppImage location. Read only the
    # installer's JSON string literal; never execute JavaScript from the adapter.
    candidates = set()
    for folder in ("plugins-1", "viewers"):
        adapter = data / "sushi" / folder / "slaydown.js"
        if adapter.is_file():
            match = re.search(r'^const BINARY = (".*");$', adapter.read_text(), re.M)
            if match:
                candidate = json.loads(match[1])
                if os.path.isfile(candidate) and os.access(candidate, os.X_OK):
                    candidates.add(str(Path(candidate).resolve()))
    if len(candidates) > 1:
        raise ValueError("Two different preview executables found. Pass the current SlayDown path explicitly.")
    return next(iter(candidates), None) or shutil.which("slaydown")


def exec_quote(path):
    # Desktop Entry Exec has two escaping layers: string values, then argv.
    if any(c in path for c in "\n\r\t"):
        raise ValueError("Move SlayDown to a path without tabs or newlines and rerun.")
    quoted = ''.join('\\' + c if c in '\\"`$' else c for c in path)
    return '"' + quoted.replace('\\', '\\\\').replace('%', '%%') + '"'


def repair(binary, data):
    if not os.access("/usr/bin/env", os.X_OK):
        raise ValueError("The standard /usr/bin/env executable is required.")
    for command in ("gio", "gjs", "update-desktop-database"):
        if not shutil.which(command):
            raise ValueError(f"Missing {command}. On Omarchy install: sudo pacman -S --needed nautilus gjs desktop-file-utils")
    binary = binary or find_binary(data)
    if not binary or not os.path.isfile(binary) or not os.access(binary, os.X_OK):
        raise ValueError("Pass the absolute path to your SlayDown 0.3.0+ executable/AppImage.")
    binary = str(Path(binary).resolve())
    command = exec_quote(binary)
    # Verify the preview CLI before changing any application registration.
    result = subprocess.run([binary, "--preview-appearance"], check=True, capture_output=True, text=True)
    appearance = json.loads(result.stdout)
    if not isinstance(appearance, dict) or "readingStyle" not in appearance:
        raise ValueError("This executable did not return SlayDown appearance settings.")
    applications = data / "applications"
    applications.mkdir(parents=True, exist_ok=True)
    desktop = applications / DESKTOP_ID
    backup = desktop.with_suffix(".desktop.slaydown-backup")
    if desktop.exists() and not backup.exists():
        shutil.copy2(desktop, backup)
    desktop.write_text(
        "[Desktop Entry]\nType=Application\nName=SlayDown\n"
        "Comment=A beautiful, lightweight Markdown reader\n"
        # GIO checks argv[0] exists before expanding %% field escapes. Using
        # env keeps percent signs in AppImage paths in an argument, where GIO
        # expands them correctly. No shell is involved; -- ends env options.
        f"Exec=/usr/bin/env -- {command} %f\n"
        "Icon=slaydown\nTerminal=false\nCategories=Office;\n"
        "StartupWMClass=slaydown\nMimeType=text/markdown;text/x-markdown;\n",
        encoding="utf-8",
    )
    subprocess.run(["update-desktop-database", str(applications)], check=True)
    for mime in MIME_TYPES:
        subprocess.run(["gio", "mime", mime, DESKTOP_ID], check=True)
    # Verify through the same API used by Sushi, not just the config file.
    verify = '''const Gio = imports.gi.Gio;
for (const type of ['text/markdown', 'text/x-markdown']) {
    const app = Gio.AppInfo.get_default_for_type(type, false);
    if (!app || app.get_id() !== 'SlayDown.desktop' || app.get_display_name() !== 'SlayDown')
        throw new Error('Default handler did not update for ' + type);
}'''
    subprocess.run(["gjs", "-c", verify], check=True)
    print(f"Markdown now opens in SlayDown: {binary}")
    print("Close Folio and log out/back in to restart Files and Sushi. Then preview a Markdown file again.")
    print("Other file types and old application files were left unchanged.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("binary", nargs="?", help="SlayDown executable/AppImage; defaults to the installed Sushi adapter's path")
    args = parser.parse_args()
    if sys.platform != "linux":
        parser.error("Run this on your Linux computer, not on macOS or Windows.")
    data = Path(os.environ.get("XDG_DATA_HOME") or Path.home() / ".local/share")
    if not data.is_absolute():
        parser.error("XDG_DATA_HOME must be an absolute path.")
    try:
        repair(args.binary, data)
    except (OSError, ValueError, subprocess.CalledProcessError) as error:
        print(f"Could not complete desktop repair: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
