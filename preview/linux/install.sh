#!/usr/bin/env bash
set -euo pipefail
# Per-user adapter only. Does not replace Sushi, its D-Bus service, or other viewers.
root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
data="${XDG_DATA_HOME:-$HOME/.local/share}/sushi"
set_default=false
if [[ "${1:-}" == --set-default ]]; then set_default=true; shift; fi
if [[ "${1:-}" == --uninstall ]]; then
  rm -f "$data/viewers/slaydown.js" "$data/plugins-1/slaydown.js"
  echo 'Removed SlayDown preview adapters. Log out and back in to restart Sushi.'
  exit 0
fi
binary="${1:-$(command -v slaydown || true)}"
if [[ -z "$binary" || ! -x "$binary" ]]; then
  echo 'Install SlayDown 0.3.0 or later first, or pass the absolute path to its executable/AppImage.' >&2; exit 1
fi
binary="$(realpath "$binary")"
"$binary" --preview-appearance >/dev/null
command -v gjs >/dev/null || { echo 'Install gjs and sushi first.' >&2; exit 1; }
command -v python3 >/dev/null
# Install only the ABI matching the currently installed Sushi, never import GTK4
# into its GTK3 process. Package-manager queries also work without a GUI session.
version=""
if command -v pacman >/dev/null; then version="$(pacman -Q sushi 2>/dev/null | awk '{print $2}' || true)"; fi
if [[ -z "$version" ]] && command -v dpkg-query >/dev/null; then version="$(dpkg-query -W -f='${Version}' gnome-sushi 2>/dev/null || true)"; fi
major="${version%%.*}"
if [[ ! "$major" =~ ^[0-9]+$ || "$major" -lt 46 ]]; then
  echo 'Sushi 46 or newer is required and was not detected. On Omarchy run: sudo pacman -S --needed sushi gjs python desktop-file-utils' >&2
  echo 'On Debian/Ubuntu install gnome-sushi. Then rerun this installer.' >&2; exit 1
fi
if (( major >= 51 )); then
  gjs -c 'imports.gi.versions.WebKit="6.0"; imports.gi.WebKit;' >/dev/null
  target="$data/plugins-1/slaydown.js"; source="$root/sushi-modern.js"
else
  gjs -c 'imports.gi.versions.WebKit2="4.1"; imports.gi.WebKit2;' >/dev/null
  target="$data/viewers/slaydown.js"; source="$root/sushi-legacy.js"
fi
mkdir -p "$(dirname "$target")"
python3 - "$source" "$target" "$binary" <<'PY'
import json, pathlib, sys
source, target, binary = sys.argv[1:]
text = pathlib.Path(source).read_text().replace("'@@SLAYDOWN_BINARY@@'", json.dumps(binary))
if '@@SLAYDOWN_BINARY@@' in text or '@@BRIDGE@@' in text:
    raise SystemExit('Use the packaged adapter or run node scripts/build-linux-preview.mjs first.')
pathlib.Path(target).write_text(text)
PY
if "$set_default"; then
  python3 "$root/repair-desktop.py" "$binary"
else
  echo 'To make SlayDown the Markdown default (including Sushi’s top Open With button), rerun with --set-default before the executable path.'
fi
printf 'Installed SlayDown for Sushi %s. Log out and back in, then select a Markdown file in Files and press Space.\n' "$version"
