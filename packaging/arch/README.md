# Experimental Omarchy / Arch packaging

SlayDown was confirmed working on a physical **x86_64 Omarchy 4.0.4-1** machine by the user on September 18, 2026. The installation method was not specified. **The experimental package and workflow in this directory remain unverified and are not part of the published release.**

Omarchy uses Nautilus and Sushi for Space-bar preview. SlayDown 0.3.0 includes a separate, per-user Sushi adapter; use the [preview installation guide](../../preview/README.md). A Quickshell bar/plugin does not intercept Nautilus selection, so no Omarchy shell plugin is needed for this workflow.

## Shared preview appearance

Fresh Omarchy installs default to the Omarchy reading style, System theme, and neutral tint. All five styles are available in preview Appearance. The app and Linux/Windows previews share validated `appearance.json` settings in the stable application configuration folder. Open the upgraded full reader once to migrate previous `folio:settings` webview preferences. Existing saved choices take precedence over defaults. Preferences synchronize between open surfaces within two seconds. Fonts are bundled offline and appearance changes never modify the source file.

Acceptance on the physical Omarchy machine: open a Markdown preview with no saved settings and verify Omarchy headings; choose GitHub, dismiss it, and preview another file; verify GitHub remains selected in both preview and full reader. Repeat with VS Code, a custom tint, and a different reading size, including after restart. Verify a full-reader change reaches an already-open preview. Existing installations must retain their saved style. The macOS Quick Look extension is a separate integration and is not covered by this Linux requirement.

The draft `PKGBUILD.in` repackages the Ubuntu-built Linux binary with Arch dependencies, a desktop entry, icons, and the MIT license. Building the binary on Ubuntu 22.04 avoids tying it to a newer glibc than Omarchy's delayed Arch mirror. `scripts/package-arch.sh` generates actual checksums from the selected build artifact; it never installs a `.deb` through pacman.

The separate **Experimental Arch and Wayland check** workflow is manual only. Pass a successful main build run ID. It attempts to make and install the native Arch package, validate its desktop entry and shared libraries, and launch SlayDown under headless Weston. Its disposable container permits nested user namespaces so WebKit can keep its sandbox; product sandbox settings are unchanged.

The startup check observes a native window and a Wayland buffer. It does not prove Markdown content, file-picker portals, editor launch, or Hyprland behavior. The user's successful SlayDown test provides separate hardware evidence, but does not validate this packaging workflow.

## Physical acceptance checks

1. Install the updated app and Sushi adapter; log out/back in, then select a Markdown file in Files and press Space.
2. Run the appearance/restart acceptance above. Confirm other file types still use Sushi's original previews, and previewing another file leaves the full reader document unchanged.
3. Record the installation method and verify launcher visibility, Markdown associations, HiDPI, editor launch, live refresh in the full reader, and adapter uninstall.
4. Terminal-only editors still need a terminal wrapper.
5. The native Arch package remains experimental until its separate workflow and physical installation checks pass; no AUR listing is published.
