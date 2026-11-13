# Contributing to Auralis

Use Windows with the prerequisites in [README](README.md). Install with `npm ci` and start with `npm run tauri -- dev`.

## Validation

1. Keep changes focused and preserve opt-in capture and keyboard control.
2. Run `npm run build`.
3. Run `cargo test --locked --manifest-path src-tauri/Cargo.toml`.
4. Manually check affected native features; browser preview cannot validate them.

For scenes, check both lyric styles, panel hide/show, exit behavior, and shared border settings. For playback, check pause, seek, track changes, missing metadata, and output-device changes. For keyboard changes, state the laptop model and check opt-in, stop, and normal exit.

Do not automatically run ignored hardware tests: they can access audio, media sessions, or the keyboard driver. Review the source and run only the specific test appropriate for your device.

Commit both lockfiles (`package-lock.json` and `src-tauri/Cargo.lock`). Exclude dependencies, build outputs, credentials, personal logs, recordings, and copyrighted lyric files. Use original sample text in examples.

Pull requests should explain the problem, resulting behavior, checks performed, and any limitations. CI verifies compilation and unit tests, not live hardware or installer signing.
