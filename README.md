# Auralis

**Your music, across your screen.**

A Windows desktop app combining audio-reactive edge lighting, synchronized lyrics, and an immersive Listening Scene. Built with **Tauri 2, React, TypeScript, and Rust**.

> Early development · Windows desktop · Version 0.1.0
>
> Hardware support is currently limited. A signed installer is not yet provided.

## Features

| Feature | What it does |
| --- | --- |
| Desktop glow | A transparent, click-through border that reacts to playback on your primary display. |
| Lighting controls | Custom colors, brightness, sensitivity, smoothing, border thickness, and glow spread. |
| Keyboard sync | Optional single-zone RGB reaction on the tested ASUS TUF Gaming F16 FX608JMR. |
| Spotify lyrics | Synchronizes selected lyrics with Spotify desktop's Windows playback information. |
| YouTube / browser lyrics | Reads media information exposed to Windows by the browser; availability depends on the page. |
| Lyric lookup and import | Manually search LRCLIB or import local LRC files. Enhanced LRC enables real word timing. |
| Floating lyrics | Customizable transparent overlay with drag and click-through controls. |
| Listening Scene | Full-screen Classic lines or Constellation lyrics, shared audio-reactive glow, palettes, and a hideable bottom panel. |
| Saved preferences | Appearance settings stay on your device. Capture and keyboard sync start off. |

## Getting started on Windows

### Prerequisites

- [Node.js LTS](https://nodejs.org/) with npm.
- [Rust through rustup](https://www.rust-lang.org/tools/install), using the MSVC toolchain. Cargo is included.
- [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/): select **Desktop development with C++** and a Windows SDK.
- [Microsoft Edge WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/), if not already installed.
- [Git](https://git-scm.com/downloads/win) to clone the repository.

See the official [Tauri Windows prerequisites](https://v2.tauri.app/start/prerequisites/) for details. Reopen PowerShell after installation and check:

```powershell
node --version
npm --version
rustc --version
cargo --version
```

### Run the app

Clone the repository using GitHub's **Code** button, then open PowerShell in the project folder:

```powershell
npm ci
npm run tauri -- dev
```

`npm ci` installs the committed dependency versions. The first desktop launch compiles Rust and can take several minutes. This project uses npm; pnpm is not required.

### First listening session

1. Play music through your default Windows speakers or headphones.
2. Click **Start listening**, customize your colors, then **Show desktop glow**.
3. Select **Spotify desktop** or **YouTube / browser** in the lyrics panel.
4. Click **Find lyrics** and choose the matching recording, or import an LRC file.
5. Open **Desktop lyrics** or **Enter Listening Scene**.
6. Use **Hide panel** / **Show panel** at the top-right of the scene. Move the mouse to reveal the top controls. Press **Esc** to leave.

Keyboard sync is optional and independent of lyrics. Read the [user guide](docs/USER_GUIDE.md) for timing adjustments, appearance controls, and hardware behavior.

## Development

| Command | Purpose |
| --- | --- |
| `npm run dev` | Browser UI preview at `http://localhost:1420`. |
| `npm run build` | Type-check and build the frontend. |
| `npm run tauri -- dev` | Run the native Windows app with live updates. |
| `cargo test --locked --manifest-path src-tauri/Cargo.toml` | Native unit tests; hardware tests are ignored by default. |
| `npm run tauri -- build` | Build a release app and installers on Windows. |

Installers are generated under `src-tauri/target/release/bundle/`. Packaging can download additional tools; signing is not configured.

Browser preview cannot access Windows audio, media sessions, or the keyboard. For an original sample-text scene preview, open `http://localhost:1420/?sceneDemo=1#listening-scene` while the frontend server is running.

See [architecture notes](docs/ARCHITECTURE.md) and [contributing](CONTRIBUTING.md) for the source map and validation workflow.

## Privacy

- Playback samples are measured in memory and discarded. Auralis does not record or upload audio and does not open the microphone.
- Clicking **Find lyrics** sends the search text to [LRCLIB](https://lrclib.net/docs). Imported LRC files stay local.
- Metadata comes from Windows media sessions. No Spotify login, browser extension, or browser-history access is used.
- Preferences are stored locally. No analytics are implemented.

## Current limits

- Windows-specific backend; macOS and Linux are not supported.
- Desktop glow covers the primary display, not the Windows lock screen or exclusive-fullscreen apps.
- Restart listening after changing output devices. Toggle the border after changing display layout.
- Lyric lookup is manual per track. Alternate recordings, intros, ads, and missing timelines affect synchronization.
- Standard LRC is line-timed. Word highlighting requires enhanced LRC timestamps; timing is not inferred from audio.
- Keyboard support is confirmed only on ASUS TUF Gaming F16 FX608JMR. Armoury Crate may override colors. Normal stop restores the selected base color, not the previous Armoury Crate effect.

## Troubleshooting

| Problem | What to try |
| --- | --- |
| `cargo` is not recognized | Install Rust, reopen PowerShell, and ensure `%USERPROFILE%\.cargo\bin` is on PATH. |
| C++ linker or SDK missing | Install the C++ desktop workload and Windows SDK through Visual Studio Installer. |
| PowerShell blocks `npm.ps1` | Use `npm.cmd` instead of `npm`. |
| npm reports a `matches` error | Stop dev servers and use `npm ci` to recreate dependencies. Avoid mixing package managers. |
| Vite reports `EBUSY` in Rust outputs | Keep the `src-tauri` watch exclusion in `vite.config.ts` and restart the dev server. |
| No audio detected | Play through the default output, then stop/start capture. |
| Browser lyrics do not sync | Check that the page exposes a Windows timeline and select the matching browser session and recording. |
| Port 1420 is busy | Close the other Auralis dev server and retry. |

## Roadmap

- Refine scene motion and transitions.
- Improve lyric matching and timing diagnostics.
- Add display selection and broader, explicitly tested hardware support.
- Prepare signed releases and installer validation.

## Credits and licensing

Built with [Tauri](https://tauri.app/), [React](https://react.dev/), [Rust](https://www.rust-lang.org/), and [LRCLIB](https://lrclib.net/). ASUS protocol reference: [G-Helper ASUS interface](https://github.com/seerge/g-helper/blob/main/app/AsusACPI.cs).

Visual inspiration includes Lumn and Verci. Auralis is independent and is not affiliated with them, Spotify, YouTube, or ASUS. No commercial lyric collection or reference-product assets are bundled.

An open-source license has not yet been selected. Third-party dependencies and imported lyrics remain subject to their own licenses and rights.
