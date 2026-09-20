#!/usr/bin/env bash
set -euo pipefail
# Runs inside an isolated CI D-Bus session as a normal user, never as root.
FOLIO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export XDG_RUNTIME_DIR
XDG_RUNTIME_DIR="$(mktemp -d)"
chmod 700 "$XDG_RUNTIME_DIR"
export WAYLAND_DISPLAY=wayland-folio
export GDK_BACKEND=wayland
export LIBGL_ALWAYS_SOFTWARE=1
FOLIO_APP_PID=''
FOLIO_COMPOSITOR_PID=''
cleanup() {
  [[ -z "$FOLIO_APP_PID" ]] || kill "$FOLIO_APP_PID" 2>/dev/null || true
  [[ -z "$FOLIO_COMPOSITOR_PID" ]] || kill "$FOLIO_COMPOSITOR_PID" 2>/dev/null || true
  rm -rf "$XDG_RUNTIME_DIR"
}
trap cleanup EXIT
weston --backend=headless --renderer=pixman --socket="$WAYLAND_DISPLAY" --idle-time=0 --log="$XDG_RUNTIME_DIR/weston.log" &
FOLIO_COMPOSITOR_PID=$!
for attempt in {1..30}; do
  [[ ! -S "$XDG_RUNTIME_DIR/$WAYLAND_DISPLAY" ]] || break
  kill -0 "$FOLIO_COMPOSITOR_PID"
  sleep 1
done
[[ -S "$XDG_RUNTIME_DIR/$WAYLAND_DISPLAY" ]] || { cat "$XDG_RUNTIME_DIR/weston.log"; exit 1; }
mkdir -p "$FOLIO_ROOT/test-results"
FOLIO_LOG="$FOLIO_ROOT/test-results/arch-wayland.log"
WAYLAND_DEBUG=client slaydown "$FOLIO_ROOT/examples/Reading sample.md" > "$FOLIO_LOG" 2>&1 &
FOLIO_APP_PID=$!
for attempt in {1..60}; do
  if ! kill -0 "$FOLIO_APP_PID" 2>/dev/null; then cat "$FOLIO_LOG"; exit 1; fi
  if grep -q 'set_title("SlayDown")' "$FOLIO_LOG" && grep -Eq 'wl_surface[@#][0-9]+\.attach\(wl_buffer[@#]' "$FOLIO_LOG"; then
    sleep 3
    kill -0 "$FOLIO_APP_PID"
    echo 'Arch Wayland smoke passed: SlayDown opened a native window and submitted a rendered buffer.'
    exit 0
  fi
  sleep 1
done
cat "$FOLIO_LOG"
echo 'SlayDown did not draw a Wayland window in time.' >&2
exit 1
