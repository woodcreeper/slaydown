---
name: omarchy-desktop-control
description: Safely inspect and operate the small set of Hyprland applications used to capture the SlayDown Omarchy product film. Use for authentic full-monitor or app-window PNG capture, focus, pointer clicks, text entry, individual key combinations, and bounded UI waits during this production workflow; do not use it as general desktop automation.
---

# Omarchy Desktop Control

Use `scripts/bridge.py` as the only input and capture entry point. It wraps
`hyprctl`, `grim`, `wtype`, and a private `ydotoold` socket. It rejects input
unless the active window is on its built-in allowlist and refuses monitor
captures when the active workspace contains a visible non-production app.

The allowed applications are the Omarchy agent/T3 Code, Nautilus, Sushi,
SlayDown, Zed, and a disposable Foot window titled `SlayDown Capture Test…`.
Keep production apps on a dedicated workspace. Dismiss or move every unrelated
window before taking a monitor capture, even if it belongs to an allowed class.

Run the bridge from the repository root:

```sh
video/tools/omarchy-desktop-control/scripts/bridge.py inspect
video/tools/omarchy-desktop-control/scripts/bridge.py focus --app nautilus
video/tools/omarchy-desktop-control/scripts/bridge.py capture monitor --app nautilus --name nautilus-plan
video/tools/omarchy-desktop-control/scripts/bridge.py capture window --app slaydown --name reader-outline
video/tools/omarchy-desktop-control/scripts/bridge.py click --app zed --x 720 --y 450
video/tools/omarchy-desktop-control/scripts/bridge.py type --app zed --text '# A plan'
video/tools/omarchy-desktop-control/scripts/bridge.py key --app zed --combo ctrl+s
video/tools/omarchy-desktop-control/scripts/bridge.py wait --seconds 1.5
```

Screenshots are written only to `video/public/screenshots/omarchy/` as PNGs.
The command prints JSON containing the resulting absolute path; inspect that
file visually before the next UI action. Capture names may contain only lower-
case letters, digits, and hyphens.

Before the first pointer action in a login session, confirm that the private
socket `/run/user/1000/omarchy-desktop-control.sock` exists. If it does not,
stop and obtain authorization to start `ydotoold`; do not fall back to X11-only
input, Hyprland configuration edits, or broad system automation. Keep every
wait at 60 seconds or less.
