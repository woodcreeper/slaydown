#!/usr/bin/env bash
set -euo pipefail
# Run the installed app in an isolated Xvfb/D-Bus session, not a web mock.
root="$(pwd)"
export XDG_DATA_HOME="$(mktemp -d)"
export XDG_CONFIG_HOME="$(mktemp -d)"
export GDK_BACKEND=x11
export GDK_SCALE=1
unset GTK_THEME
mkdir -p "$XDG_CONFIG_HOME/gtk-3.0" "$root/test-results"
printf '[Settings]\ngtk-theme-name=Adwaita\ngtk-application-prefer-dark-theme=false\n' > "$XDG_CONFIG_HOME/gtk-3.0/settings.ini"
binary="$root/src-tauri/target/release/slaydown"
set_appearance() {
  printf '{"theme":"%s","readingStyle":"omarchy","tint":"#b96683","fontSize":17}' "$1" | "$binary" --preview-save
}
set_appearance dark
"$binary" > "$root/test-results/linux-chrome.log" 2>&1 &
pid=$!
trap 'kill "$pid" 2>/dev/null || true' EXIT
window=$(xdotool search --sync --onlyvisible --pid "$pid" --name SlayDown | head -1)
xdotool windowmove "$window" 0 0
xdotool windowsize "$window" 1120 800
xdotool windowfocus "$window"
# Checking a clear patch of the native menu catches the white-background bug.
# Poll for GTK and the reader's shared-settings refresh to present their frames.
check_theme() {
  local name="$1" expected="$2"
  for attempt in {1..20}; do
    sleep 1
    scrot --overwrite "$root/test-results/linux-$name.png"
    if python3 - "$root/test-results/linux-$name.png" "$expected" <<'PY'
import sys
from PIL import Image, ImageStat
image = Image.open(sys.argv[1]).convert('RGB')
menu = ImageStat.Stat(image.crop((350, 5, 450, 15))).mean
reader = ImageStat.Stat(image.crop((1080, 400, 1090, 420))).mean
is_dark = sys.argv[2] == 'dark'
assert all((sum(rgb) / 3 < 100) if is_dark else (sum(rgb) / 3 > 180) for rgb in [menu, reader]), (menu, reader)
PY
    then return; fi
  done
  return 1
}
check_theme dark dark
# Retain native File menu and document shortcuts, including its readable popup.
xdotool mousemove --window "$window" 22 12 click 1
sleep 1
scrot --overwrite "$root/test-results/linux-dark-menu.png"
xdotool key Escape
set_appearance light
check_theme light light
set_appearance dark
check_theme dark-again dark
set_appearance system
check_theme system light
printf 'Native menu and reader followed dark, light, dark, and system preferences.\n'
