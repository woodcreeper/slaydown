# Omarchy / Arch packaging

SlayDown was confirmed working on a physical **x86_64 Omarchy 4.0.4-1** machine by the user on September 18, 2026. On September 20, the user identified the installed native package as **slaydown-markdown**. Releases include a matching `.pkg.tar.zst` for installation and upgrades with `sudo pacman -U /path/to/package.pkg.tar.zst`; settings remain in the user configuration folder. See the [install/update commands](../../README.md#omarchy--arch-linux).

Omarchy uses Nautilus and Sushi for Space-bar preview. SlayDown 0.3.1 installs its bundled per-user adapter when launched; Sushi itself is an optional system dependency; use the [preview installation guide](../../preview/README.md). A Quickshell bar/plugin does not intercept Nautilus selection, so no Omarchy shell plugin is needed for this workflow.

## Shared preview appearance

Fresh Omarchy installs default to the Omarchy reading style, System theme, and neutral tint. All five styles are available in preview Appearance. The app and Linux/Windows previews share validated `appearance.json` settings in the stable application configuration folder. Open the upgraded full reader once to migrate previous `folio:settings` webview preferences. Existing saved choices take precedence over defaults. Preferences synchronize between open surfaces within two seconds. Fonts are bundled offline and appearance changes never modify the source file.

Acceptance on the physical Omarchy machine: open a Markdown preview with no saved settings and verify Omarchy headings; choose GitHub, dismiss it, and preview another file; verify GitHub remains selected in both preview and full reader. Repeat with VS Code, a custom tint, and a different reading size, including after restart. Verify a full-reader change reaches an already-open preview. Existing installations must retain their saved style. The macOS Quick Look extension is a separate integration and is not covered by this Linux requirement.

`PKGBUILD.in` repackages the Ubuntu-built Linux binary with Arch dependencies, a desktop entry, icons, and the MIT license. Building the binary on Ubuntu 22.04 avoids tying it to a newer glibc than Omarchy's delayed Arch mirror. `scripts/package-arch.sh` generates actual checksums from the selected build artifact; it never installs a `.deb` through pacman.

The **Arch package and Wayland check** workflow runs as part of every main build and is required by the release publishing job. It can also be run manually with a successful Linux build run ID. It makes and installs the native Arch package, checks the installed binary version against the package version, validates its desktop entry and shared libraries, and launches SlayDown under headless Weston. The disposable runner permits nested namespaces so GTK image loaders and WebKit keep their sandboxes; no user-machine security settings are changed.

The startup check observes a native window and a Wayland buffer. It does not prove Markdown content, file-picker portals, editor launch, or Hyprland behavior. Installed-package Sushi and native menu/theme checks run separately on Ubuntu. Physical Omarchy testing remains part of release acceptance.

## Physical acceptance checks

1. Quit the old app, install Sushi if missing, and open the updated SlayDown once; log out/back in, then select a Markdown file in Files and press Space.
2. Run the appearance/restart acceptance above. Confirm other file types still use Sushi's original previews, and previewing another file leaves the full reader document unchanged.
3. Record the installation method and verify launcher visibility, Markdown associations, HiDPI, editor launch, live refresh in the full reader, and adapter uninstall.
4. Terminal-only editors still need a terminal wrapper.
5. No AUR or pacman repository listing is published. Download the matching native package from each release to update; `pacman -Syu` alone cannot fetch it.
