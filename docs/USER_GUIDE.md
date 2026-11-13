# Auralis user guide

A beginner-friendly Windows desktop app with local playback capture, a desktop-edge glow, ASUS TUF keyboard sync, and Spotify synchronized lyrics.

## Spotify lyrics

### Listening Scene

Load lyrics, then click **Enter Listening Scene** for a full-screen view. **Classic lines** keeps the existing clean three-line style. **Constellation** uses depth, individually arranged words, and optional symbols. Both share the same dark/haze backdrop and audio-reactive edge glow. Switch styles without restarting playback. Choose Amber, Rose, Ice, or use the custom lyric colors in Auralis. Scene preferences are saved locally.

Use **Hide panel** / **Show panel** at the top-right to hide or restore the bottom panel. This choice is saved. Move the pointer to reveal scene controls. **Exit scene** or **Escape** returns to the app. The ordinary desktop border and floating lyrics windows are temporarily hidden while the scene is open and restored on exit. The scene renders the same desktop-glow component internally, using shared lighting colors, brightness, thickness, glow spread, sensitivity, and smoothing. Its lyric palette does not override the lighting palette. **Start light reaction** uses the same local playback capture as the existing lighting features; it is not required for lyric timing.

Real word highlighting requires an enhanced LRC file with word timestamps, such as `[00:10.00]<00:10.00>First <00:10.60>word`. The parser supports line offsets, repeated line timestamps, and monotonically ordered word timestamps. Standard LRCLIB line-timed results remain line-timed: Constellation animates their words together without inventing individual vocal timing. This is a reel-inspired presentation, not an exact recreation of Verci's timing provider or rendering engine. A labeled browser-only design preview is available at `/?sceneDemo=1#listening-scene`; it uses original sample text and never controls audio or hardware.

### YouTube in a browser

Select **YouTube / browser** under **Lyrics player**, then play a YouTube music video. Auralis reads media metadata and timing exposed by the browser to Windows. Chrome, Edge, Firefox, Brave, Opera, Vivaldi, and Chromium identifiers are recognized, but actual metadata/timeline availability depends on the browser and page. This is not direct YouTube integration: Windows does not supply a website URL, and Auralis cannot select tabs. Pause other browser media, or choose a specific browser session when several browsers are active.

Edit **Find a recording** to use the song title and artist (YouTube may supply the uploader/channel instead), click **Find lyrics**, and select the matching version. The same desktop overlay, timing adjustment, pause/seek tracking, and LRC import work with browser playback. Ads, music-video intros, alternate versions, and live streams may not match lyric timestamps. No usable timeline means automatic synchronization is unavailable; the UI reports this. Player selection is saved. Switching players or detected tracks clears the previous lyrics.

No browser extension is installed and no browser history is read. Only the selected player family's Windows media sessions are queried; metadata is sent to LRCLIB only when you click **Find lyrics**.

### Spotify desktop

1. Open Spotify desktop and play a song. The lyrics panel reads the Spotify session exposed by Windows (not audio recognition).
2. Click **Find lyrics**. This sends the displayed search text to [LRCLIB](https://lrclib.net/docs); no audio is sent. Choose the matching title, artist, version, and duration from the results. Lookup is manual for each song in this first version.
3. Timed lyrics highlight the current line using Spotify's Windows playback clock, including pause and seek updates. Use the timing adjustment if your recording differs slightly; positive values show lyrics earlier. Untimed results are shown as plain text.
4. **Desktop lyrics** opens a transparent, frameless, always-on-top overlay. Hover to reveal its Move handle and close button. Drag the handle to position it, or resize from the window edges. Closing the main app also closes the overlay.

**Desktop lyrics appearance** offers Depth stack and Focus presentations, current/secondary/glow colors, text size, and glow strength. Preferences are saved locally and shared with the overlay. Line changes animate smoothly; Windows reduced-motion preferences disable the entrance animation. This is line-synchronized typography, not word-level highlighting or a true fisheye shader.

**Let clicks pass through** makes the overlay ignore mouse input. Use **Unlock overlay** in the main Auralis window to regain access to the Move/close controls. A newly opened overlay is unlocked. These features target the normal desktop, not the Windows lock screen.

Alternatively import a UTF-8 `.lrc` file under 1 MB for the current song. Imports stay local. Lyrics and the timing adjustment clear when the detected track changes. The lyric text-size preference controls both views. Audio capture and keyboard sync do not need to be enabled for lyrics.

Availability depends on the Windows media information Spotify supplies and the lyrics available in LRCLIB. Ads, podcasts, live recordings, and missing metadata may not sync. If no song appears, start Spotify desktop playback. This version does not use Spotify account credentials, scrape Spotify lyrics, recognize songs from raw sound, or automatically search every track. Review lyrics licensing/attribution requirements before distributing a commercial app.

Implementation: `src-tauri/src/media.rs` reads the selected Spotify or browser Windows media session; `src/lyrics.ts` parses LRC timestamps; `src/LyricsPanel.tsx` manages lookup, timing, and track changes. `src-tauri/src/lyrics_window.rs` shares only the current three-line view with the floating window.

## Try playback capture

### Desktop edge glow

In the lighting controls, click **Show desktop glow**. A transparent, frameless, non-focusable, always-on-top window covers the primary display; Windows cursor events are ignored so the overlay does not intercept clicks. Its center stays transparent. Two-color mode places your base color along the top and your accent along the bottom, with blended side edges. Single-color mode uses one color throughout.

Start listening and play audio to pulse the border brightness. A faint idle glow remains so you can see it is enabled. The shared color, brightness, sensitivity, and fade controls apply to this border; border thickness and glow spread have separate saved controls. Keyboard sync remains independent. The color-test button is only for the in-app preview.

The border starts off each launch. **Turn off desktop glow** removes it; closing the main Auralis window exits the app and closes the overlay too. After changing display layout, resolution, or scaling, toggle the overlay off and back on to fit the primary display again. This first version targets the normal Windows desktop, not the lock screen, secure desktop, or exclusive fullscreen applications. Only the primary display is supported.

Implementation: `src-tauri/src/overlay.rs` creates the window hidden, applies physical display bounds and click-through behavior, and then shows it. `src/DesktopBorder.tsx` reads the existing audio measurements and renders the edges; it does not start another capture stream. `src/BorderControls.tsx` owns the toggle and saved dimensions. Validation tests check settings ranges; live visual alignment and click-through still need desktop confirmation.

### ASUS TUF keyboard sync

The confirmed FX608JMR keyboard supports the fixed ASUS TUF RGB endpoint used here. In the lighting section, choose your colors and click **Sync keyboard with audio**, then start listening. Brightness, sensitivity, and fade time also affect the physical keyboard. Commands are limited to five per second; unchanged colors are skipped. Single-zone hardware changes the whole keyboard together.

Sync is opt-in and starts off each launch. Turning it off or closing normally returns the keyboard to the selected base color at the selected brightness, not the previous Armoury Crate effect. Stopping audio capture also fades to that base color. Silence during active capture fades to black. A forced close/crash cannot guarantee restoration; reapply your preferred lighting in Armoury Crate. No ASUS services are stopped, so Armoury Crate may overwrite colors. The preview's color-test button does not control hardware.

Implementation: `src-tauri/src/keyboard.rs` owns the driver handle on a dedicated worker; `src/KeyboardSync.tsx` provides opt-in controls and error reporting. Only keyboard RGB endpoint `0x00100056` is written. Protocol reference: [G-Helper's ASUS interface](https://github.com/seerge/g-helper/blob/main/app/AsusACPI.cs). No fan, performance, power, or firmware settings are modified. Other laptop models have not been validated.

### Playback controls

Run `npm run tauri -- dev`, play music on your default Windows output, and click **Start listening**. The meter shows dBFS (digital signal level, not physical room loudness). Adjust preview sensitivity to change the glow. **Stop listening** releases capture. Closing the app stops capture; it never starts automatically on launch.

WASAPI loopback captures the combined audio playing on the default output selected when capture starts. No microphone is opened. Samples are measured in memory and discarded; only levels and device status reach React. Nothing is recorded or uploaded. After switching speakers/headphones, stop and start again. Protected or exclusively played content may not be available for loopback capture. Browser preview cannot capture playback.

The backend is in `src-tauri/src/audio.rs`, and the controls are in `src/AudioPanel.tsx`. A dedicated Rust worker owns the Windows audio objects; React polls a small status snapshot every 100 ms. Polling is sequential and cleaned up when the component unmounts. Capture errors appear next to the controls.
