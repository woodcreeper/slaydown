# Omarchy capture provenance

Every PNG in `public/screenshots/omarchy/` is an authentic full-monitor capture from the same Omarchy/Arch Linux computer on September 20, 2026. No screenshot was fabricated, composited, simulated, or AI-generated. The only document opened in the workflow was the public demonstration file in `public/Omarchy demo/PLAN.md`.

During production the installed native Arch package was upgraded from `slaydown-markdown 0.3.1-1` to the verified `0.3.2-1` release. The package SHA-256 matched the release manifest. The Sushi and full-reader captures were repeated after fully quitting the old process, so the committed assets show 0.3.2's compact preview toolbar and corrected dark Linux menu treatment. The agent, Nautilus, and Zed states were unaffected by that app upgrade.

The capture monitor was `eDP-1` at 2880 × 1800. Notifications were dismissed before each capture, and the capture workspace contained only the allowlisted production application. No account details, private filenames, or unrelated windows are present. Remotion crops and scales these source images for the 1920 × 1080 composition but does not alter the application UI within them.

## Capture sequence

| File | Authentic application state |
| --- | --- |
| `agent-plan.png` | The Omarchy Codex agent has created and checked `PLAN.md`. |
| `nautilus-plan.png` | `PLAN.md` is selected in Nautilus. |
| `sushi-preview.png` | Space-bar preview is open in Sushi with SlayDown. |
| `reader-outline.png` | The same file is open in the full SlayDown reader with its outline. |
| `reader-style.png` | SlayDown’s Appearance panel shows the Omarchy reading style. |
| `reader-search.png` | Document search finds “automatic refresh.” |
| `zed-before.png` | SlayDown’s **Open in Editor** action has opened the original file in Zed. |
| `zed-selected.png` | The original heading is selected. |
| `zed-typed-1.png` | The heading reads `# A plan`. |
| `zed-typed-2.png` | The heading reads `# A plan worth`. |
| `zed-typed-3.png` | The heading reads `# A plan worth sharing`. |
| `reader-refreshed.png` | After Ctrl+S in Zed, SlayDown has refreshed the heading and outline without reopening. |

All 12 PNGs are 2880 × 1800. Their exact byte hashes are available with:

```sh
sha256sum public/screenshots/omarchy/*.png
```

## Local desktop-control bridge

The task-specific bridge is versioned in `tools/omarchy-desktop-control/`. It uses the installed Hyprland/Wayland tools `hyprctl`, `grim`, and `wtype`, plus `ydotool` through a private per-user socket for pointer clicks. Its application allowlist is limited to the Omarchy agent, Nautilus, Sushi, SlayDown, Zed, and a disposable Foot test window. Monitor capture is refused when any other visible application is on the active workspace.

Before production capture, the bridge was tested in a disposable Foot window: enumerate and focus the window, capture a full-monitor PNG, click inside the window, type a harmless string, issue an individual key, and wait for the UI. The disposable captures were deleted after validation. See the skill’s `SKILL.md` for the command contract and safety rules.

SlayDown’s original editor and appearance preferences were saved before capture and restored afterward. Zed was installed from the official Arch package because no suitable graphical editor was present. The captures themselves remain ordinary PNGs and do not depend on either installed package at render time.
