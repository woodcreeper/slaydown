#!/usr/bin/env python3
"""Narrow Hyprland capture/input bridge for the SlayDown Omarchy film."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
from typing import Any


CAPTURE_ROOT = Path(__file__).resolve().parents[3] / "public" / "screenshots" / "omarchy"
YDOTOOL_SOCKET = Path(f"/run/user/{os.getuid()}/omarchy-desktop-control.sock")
NAME_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")

# Exact compositor classes only. Foot is deliberately limited to the disposable
# test title; production agent captures use the Omarchy agent/T3 Code surfaces.
APPS: dict[str, dict[str, tuple[str, ...]]] = {
    "agent": {
        "classes": ("t3code", "com.t3tools.T3Code", "org.omarchy.agent"),
        "title_prefixes": (),
    },
    "nautilus": {
        "classes": ("org.gnome.Nautilus",),
        "title_prefixes": (),
    },
    "sushi": {
        "classes": ("org.gnome.NautilusPreviewer", "org.gnome.Sushi", "sushi"),
        "title_prefixes": (),
    },
    "slaydown": {
        "classes": ("slaydown", "SlayDown", "dev.mdquickviewer.folio"),
        "title_prefixes": (),
    },
    "zed": {
        "classes": ("dev.zed.Zed", "Zed", "zed"),
        "title_prefixes": (),
    },
    "test-terminal": {
        "classes": ("foot",),
        "title_prefixes": ("SlayDown Capture Test",),
    },
}

MODIFIERS = {"ctrl", "shift", "alt", "logo", "win", "altgr", "capslock"}
KEY_ALIASES = {
    "enter": "Return",
    "return": "Return",
    "space": "space",
    "esc": "Escape",
    "escape": "Escape",
    "tab": "Tab",
    "backspace": "BackSpace",
    "delete": "Delete",
    "home": "Home",
    "end": "End",
    "left": "Left",
    "right": "Right",
    "up": "Up",
    "down": "Down",
    "pageup": "Page_Up",
    "pagedown": "Page_Down",
}


class BridgeError(RuntimeError):
    pass


def run(argv: list[str], *, env: dict[str, str] | None = None, timeout: float = 15) -> str:
    try:
        result = subprocess.run(
            argv,
            check=True,
            capture_output=True,
            text=True,
            timeout=timeout,
            env=env,
        )
    except FileNotFoundError as error:
        raise BridgeError(f"Required command is unavailable: {argv[0]}") from error
    except subprocess.CalledProcessError as error:
        detail = (error.stderr or error.stdout or "command failed").strip()
        raise BridgeError(f"{argv[0]} failed: {detail}") from error
    except subprocess.TimeoutExpired as error:
        raise BridgeError(f"{argv[0]} exceeded the {timeout:g}s safety timeout") from error
    return result.stdout.strip()


def hypr_json(command: str) -> Any:
    value = run(["hyprctl", "-j", command])
    try:
        return json.loads(value)
    except json.JSONDecodeError as error:
        raise BridgeError(f"Hyprland returned invalid JSON for {command}") from error


def windows() -> list[dict[str, Any]]:
    value = hypr_json("clients")
    if not isinstance(value, list):
        raise BridgeError("Hyprland client inventory was not a list")
    return [window for window in value if isinstance(window, dict)]


def app_for(window: dict[str, Any]) -> str | None:
    window_class = str(window.get("class", ""))
    title = str(window.get("title", ""))
    for name, rule in APPS.items():
        if window_class not in rule["classes"]:
            continue
        prefixes = rule["title_prefixes"]
        if not prefixes or any(title.startswith(prefix) for prefix in prefixes):
            return name
    return None


def active_window() -> dict[str, Any]:
    value = hypr_json("activewindow")
    if not isinstance(value, dict) or not value.get("address"):
        raise BridgeError("No active Hyprland window")
    if app_for(value) is None:
        raise BridgeError(
            f"Active window is outside the allowlist: {value.get('class', '')!r} / {value.get('title', '')!r}"
        )
    return value


def find_window(app: str, title: str | None = None) -> dict[str, Any]:
    matches = [window for window in windows() if app_for(window) == app]
    if title:
        folded = title.casefold()
        matches = [window for window in matches if folded in str(window.get("title", "")).casefold()]
    matches = [window for window in matches if window.get("mapped") and not window.get("hidden")]
    if not matches:
        raise BridgeError(f"No open {app} window matched")
    matches.sort(key=lambda window: int(window.get("focusHistoryID", 999999)))
    return matches[0]


def active_workspace_windows() -> list[dict[str, Any]]:
    workspace = hypr_json("activeworkspace")
    workspace_id = workspace.get("id") if isinstance(workspace, dict) else None
    return [
        window
        for window in windows()
        if window.get("mapped")
        and not window.get("hidden")
        and window.get("workspace", {}).get("id") == workspace_id
        and window.get("visible", True)
    ]


def require_safe_workspace() -> list[dict[str, Any]]:
    visible = active_workspace_windows()
    if not visible:
        raise BridgeError("The active workspace has no visible production window")
    rejected = [window for window in visible if app_for(window) is None]
    if rejected:
        details = ", ".join(
            f"{window.get('class', '')!r} ({window.get('title', '')!r})" for window in rejected
        )
        raise BridgeError(f"Monitor capture blocked by non-production window(s): {details}")
    return visible


def summary(window: dict[str, Any]) -> dict[str, Any]:
    return {
        "app": app_for(window),
        "address": window.get("address"),
        "class": window.get("class"),
        "title": window.get("title"),
        "workspace": window.get("workspace", {}).get("name"),
        "at": window.get("at"),
        "size": window.get("size"),
        "mapped": window.get("mapped"),
        "visible": window.get("visible"),
    }


def capture_name(name: str) -> Path:
    if not NAME_RE.fullmatch(name):
        raise BridgeError("Capture name must use lower-case letters, digits, and single hyphens")
    CAPTURE_ROOT.mkdir(parents=True, exist_ok=True)
    return CAPTURE_ROOT / f"{name}.png"


def monitor_for(window: dict[str, Any]) -> dict[str, Any]:
    monitor_id = window.get("monitor")
    monitors = hypr_json("monitors")
    if not isinstance(monitors, list):
        raise BridgeError("Hyprland monitor inventory was not a list")
    for monitor in monitors:
        if monitor.get("id") == monitor_id:
            return monitor
    raise BridgeError("The active window's monitor could not be resolved")


def do_inspect(_: argparse.Namespace) -> dict[str, Any]:
    active = hypr_json("activewindow")
    return {
        "active": summary(active) if isinstance(active, dict) and active.get("address") else None,
        "windows": [summary(window) for window in windows()],
        "allowedApps": sorted(APPS),
        "captureRoot": str(CAPTURE_ROOT),
        "ydotoolSocketReady": YDOTOOL_SOCKET.is_socket(),
    }


def do_focus(args: argparse.Namespace) -> dict[str, Any]:
    target = find_window(args.app, args.title)
    current = focus_window(target, args.app)
    return {"focused": summary(current)}


def focus_window(target: dict[str, Any], app: str) -> dict[str, Any]:
    address = str(target.get("address", ""))
    if not re.fullmatch(r"0x[0-9a-fA-F]+", address):
        raise BridgeError("Hyprland returned an invalid window address")
    run(
        [
            "hyprctl",
            "eval",
            f'hl.dispatch(hl.dsp.focus({{ window = "address:{address}" }}))',
        ]
    )
    deadline = time.monotonic() + 5
    while time.monotonic() < deadline:
        current = hypr_json("activewindow")
        if current.get("address") == address:
            return current
        time.sleep(0.1)
    raise BridgeError(f"Timed out focusing {app}")


def intended_window(args: argparse.Namespace) -> dict[str, Any]:
    if getattr(args, "app", None):
        target = find_window(args.app, getattr(args, "title", None))
        current = focus_window(target, args.app)
        if app_for(current) != args.app:
            raise BridgeError(f"Focused window did not match intended app: {args.app}")
        return current
    return active_window()


def do_capture(args: argparse.Namespace) -> dict[str, Any]:
    output = capture_name(args.name)
    if args.kind == "monitor":
        current = intended_window(args)
        visible = require_safe_workspace()
        monitor = monitor_for(current)
        monitor_name = str(monitor.get("name", ""))
        if not monitor_name:
            raise BridgeError("Hyprland returned an unnamed monitor")
        run(["hyprctl", "dismissnotify"])
        run(["grim", "-o", monitor_name, str(output)], timeout=30)
        scope: dict[str, Any] = {
            "kind": "monitor",
            "monitor": monitor_name,
            "apps": [app_for(window) for window in visible],
        }
    else:
        target = find_window(args.app, args.title)
        at = target.get("at")
        size = target.get("size")
        if not (
            isinstance(at, list)
            and isinstance(size, list)
            and len(at) == 2
            and len(size) == 2
            and all(isinstance(value, int) for value in at + size)
        ):
            raise BridgeError("Hyprland returned invalid window geometry")
        geometry = f"{at[0]},{at[1]} {size[0]}x{size[1]}"
        run(["grim", "-g", geometry, str(output)], timeout=30)
        scope = {"kind": "window", "window": summary(target), "geometry": geometry}
    if not output.is_file() or output.stat().st_size < 1024:
        raise BridgeError("Screenshot was not created or is unexpectedly small")
    return {"captured": str(output.resolve()), "bytes": output.stat().st_size, "scope": scope}


def point_inside(window: dict[str, Any], x: int, y: int) -> bool:
    at = window.get("at")
    size = window.get("size")
    return bool(
        isinstance(at, list)
        and isinstance(size, list)
        and len(at) == 2
        and len(size) == 2
        and at[0] <= x < at[0] + size[0]
        and at[1] <= y < at[1] + size[1]
    )


def do_click(args: argparse.Namespace) -> dict[str, Any]:
    current = intended_window(args)
    if not point_inside(current, args.x, args.y):
        raise BridgeError("Click position is outside the active allowlisted window")
    if not YDOTOOL_SOCKET.is_socket():
        raise BridgeError(f"Private ydotool socket is unavailable: {YDOTOOL_SOCKET}")
    run(
        [
            "hyprctl",
            "eval",
            f"hl.dispatch(hl.dsp.cursor.move({{ x = {args.x}, y = {args.y} }}))",
        ]
    )
    env = dict(os.environ)
    env["YDOTOOL_SOCKET"] = str(YDOTOOL_SOCKET)
    run(["ydotool", "click", "0xC0"], env=env)
    return {"clicked": {"x": args.x, "y": args.y}, "window": summary(current)}


def do_type(args: argparse.Namespace) -> dict[str, Any]:
    current = intended_window(args)
    if len(args.text) > 4096:
        raise BridgeError("Typed text is limited to 4096 characters per call")
    run(["wtype", "-d", str(args.delay_ms), "--", args.text], timeout=30)
    return {"typedCharacters": len(args.text), "window": summary(current)}


def do_key(args: argparse.Namespace) -> dict[str, Any]:
    current = intended_window(args)
    parts = [part.strip() for part in args.combo.split("+") if part.strip()]
    if not parts:
        raise BridgeError("Key combination is empty")
    modifiers = [part.casefold() for part in parts[:-1]]
    if len(set(modifiers)) != len(modifiers) or any(modifier not in MODIFIERS for modifier in modifiers):
        raise BridgeError("Unsupported or repeated key modifier")
    key_raw = parts[-1]
    if len(key_raw) != 1 and key_raw.casefold() not in KEY_ALIASES and not re.fullmatch(r"f(?:[1-9]|1[0-2])", key_raw.casefold()):
        raise BridgeError(f"Unsupported key name: {key_raw}")
    key = KEY_ALIASES.get(key_raw.casefold(), key_raw.upper() if key_raw.casefold().startswith("f") else key_raw)
    argv = ["wtype"]
    for modifier in modifiers:
        argv.extend(["-M", modifier])
    argv.extend(["-k", key])
    for modifier in reversed(modifiers):
        argv.extend(["-m", modifier])
    run(argv)
    return {"key": args.combo, "window": summary(current)}


def do_wait(args: argparse.Namespace) -> dict[str, Any]:
    if not 0 <= args.seconds <= 60:
        raise BridgeError("Wait must be between 0 and 60 seconds")
    time.sleep(args.seconds)
    return {"waitedSeconds": args.seconds}


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description=__doc__)
    commands = result.add_subparsers(dest="command", required=True)

    inspect = commands.add_parser("inspect", help="List Hyprland windows and allowlist matches")
    inspect.set_defaults(handler=do_inspect)

    focus = commands.add_parser("focus", help="Focus an allowlisted application window")
    focus.add_argument("--app", required=True, choices=sorted(APPS))
    focus.add_argument("--title", help="Optional case-insensitive title substring")
    focus.set_defaults(handler=do_focus)

    capture = commands.add_parser("capture", help="Capture a monitor or app window to the fixed PNG directory")
    capture.add_argument("kind", choices=("monitor", "window"))
    capture.add_argument("--name", required=True)
    capture.add_argument("--app", required=True, choices=sorted(APPS))
    capture.add_argument("--title", help="Optional case-insensitive title substring")
    capture.set_defaults(handler=do_capture)

    click = commands.add_parser("click", help="Click inside the active allowlisted window")
    click.add_argument("--app", choices=sorted(APPS))
    click.add_argument("--title", help="Optional case-insensitive title substring")
    click.add_argument("--x", type=int, required=True)
    click.add_argument("--y", type=int, required=True)
    click.set_defaults(handler=do_click)

    type_command = commands.add_parser("type", help="Type text into the active allowlisted window")
    type_command.add_argument("--app", choices=sorted(APPS))
    type_command.add_argument("--title", help="Optional case-insensitive title substring")
    type_command.add_argument("--text", required=True)
    type_command.add_argument("--delay-ms", type=int, default=18, choices=range(0, 201), metavar="0..200")
    type_command.set_defaults(handler=do_type)

    key = commands.add_parser("key", help="Issue one key or modifier combination")
    key.add_argument("--app", choices=sorted(APPS))
    key.add_argument("--title", help="Optional case-insensitive title substring")
    key.add_argument("--combo", required=True)
    key.set_defaults(handler=do_key)

    wait = commands.add_parser("wait", help="Wait for a bounded UI update")
    wait.add_argument("--seconds", type=float, required=True)
    wait.set_defaults(handler=do_wait)
    return result


def main() -> int:
    args = parser().parse_args()
    result = args.handler(args)
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except BridgeError as error:
        print(json.dumps({"error": str(error)}, indent=2), file=sys.stderr)
        raise SystemExit(2)
