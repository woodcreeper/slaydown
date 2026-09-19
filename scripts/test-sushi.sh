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
bash build/SlayDown-Sushi/install.sh "$root/src-tauri/target/release/slaydown"
# URI encoding must not split filenames or turn document text into a command.
uri=$(python3 -c 'import pathlib,sys; print(pathlib.Path(sys.argv[1]).as_uri())' "$fixture")
G_MESSAGES_DEBUG=all sushi "$fixture" > "$logfile" 2>&1 &
pid=$!
trap 'kill "$pid" 2>/dev/null || true' EXIT
for attempt in {1..40}; do
  if rg -q 'SlayDown preview rendered' "$logfile"; then
    gdbus call --session --dest org.gnome.NautilusPreviewer --object-path /org/gnome/NautilusPreviewer --method org.gnome.NautilusPreviewer2.Close
    echo 'Sushi loaded the plugin and its shared JavaScript renderer.'
    exit 0
  fi
  sleep 1
done
cat "$logfile"
exit 1
