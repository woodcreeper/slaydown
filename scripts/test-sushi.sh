#!/usr/bin/env bash
set -euo pipefail
# Run in a disposable Linux CI login with Xvfb and a D-Bus session.
root="$(pwd)"
export XDG_DATA_HOME="$(mktemp -d)"
export XDG_CONFIG_HOME="$(mktemp -d)"
logfile="$root/test-results/sushi.log"
mkdir -p "$root/test-results"
fixture="$XDG_DATA_HOME/Unicode notes Ω with spaces.md"
printf '# SlayDown preview smoke test\n\nRendered **Markdown**, offline.\n' > "$fixture"
bash build/SlayDown-Sushi/install.sh --set-default "$root/src-tauri/target/release/slaydown"
service=$(awk -F= '/^Exec=/{print $2}' /usr/share/dbus-1/services/org.gnome.NautilusPreviewer.service)
[[ -x "$service" ]]
SUSHI_PERSIST=1 G_MESSAGES_DEBUG=all "$service" > "$logfile" 2>&1 &
pid=$!
trap 'kill "$pid" 2>/dev/null || true' EXIT
gdbus wait --session --timeout 10 org.gnome.NautilusPreviewer
sushi "$fixture"
for attempt in {1..40}; do
  if rg -q 'SlayDown preview rendered' "$logfile"; then
    sleep 2 # Let the compositor present the completed WebKit frame before capture.
    scrot "$root/test-results/sushi.png"
    gdbus call --session --dest org.gnome.NautilusPreviewer --object-path /org/gnome/NautilusPreviewer --method org.gnome.NautilusPreviewer2.Close
    echo 'Sushi loaded the plugin and its shared JavaScript renderer.'
    exit 0
  fi
  sleep 1
done
cat "$logfile"
exit 1
