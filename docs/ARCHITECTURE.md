# Architecture

React runs in Tauri's Windows WebView2 shell. Rust owns native resources and exposes commands and compact status snapshots.

| Location | Responsibility |
| --- | --- |
| `src/App.tsx` | Settings screen and command/event demonstration. |
| `src/AudioPanel.tsx` | Capture controls and level display. |
| `src/LightingPreview.tsx`, `src/BorderControls.tsx`, `src/KeyboardSync.tsx` | Shared lighting settings and opt-in outputs. |
| `src/DesktopBorder.tsx`, `src/glowMotion.ts` | Border rendering and frame-rate-independent smoothing. |
| `src/LyricsPanel.tsx`, `src/lyrics.ts` | Manual search, LRC parsing, and playback synchronization. |
| `src/FloatingLyrics.tsx`, `src/ListeningScene.tsx` | Floating and full-screen lyric views. |
| `src/lyricAppearance.ts` | Locally saved lyric appearance shared across windows. |
| `src-tauri/src/audio.rs` | WASAPI loopback worker; samples are measured then discarded. |
| `src-tauri/src/keyboard.rs` | ASUS RGB worker, limited to five updates per second. |
| `src-tauri/src/media.rs` | Windows media sessions and playback metadata. |
| `src-tauri/src/overlay.rs` | Desktop border window and shared lighting state. |
| `src-tauri/src/lyrics_window.rs` | Floating window and shared lyric snapshot. |
| `src-tauri/src/scene.rs` | Scene lifecycle and hiding/restoring overlays. |
| `src-tauri/capabilities/` | Window-specific Tauri permissions. |

The UI polls backend snapshots. Audio levels feed animation-frame smoothing and the separate keyboard worker. The Listening Scene embeds the same border renderer and lighting state as the desktop glow.

Lyrics use Windows playback position, not audio recognition. The main panel parses a selected result or imported LRC, identifies the active line/word, and shares the view with other windows. Line timestamps are never converted into invented word timings.

Preferences use local storage. Capture and keyboard sync require opt-in. Closing the main window exits the app and releases workers; hardware restoration after forced termination cannot be guaranteed.
