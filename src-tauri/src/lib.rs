mod audio;
mod keyboard;
mod overlay;
mod media;
mod lyrics_window;
mod scene;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {name}! Rust is connected.")
}

pub fn run() {
    let audio = audio::AudioState::default();
    let keyboard = keyboard::KeyboardState::new(audio.status.clone());
    tauri::Builder::default()
        .manage(audio)
        .manage(keyboard)
        .manage(overlay::OverlayState::default())
        .manage(lyrics_window::LyricsView::default())
        .invoke_handler(tauri::generate_handler![greet, audio::start_audio, audio::stop_audio, audio::audio_status, keyboard::configure_keyboard, keyboard::keyboard_status, keyboard::update_keyboard_settings, overlay::border_frame, overlay::border_enabled, overlay::update_border, overlay::set_border, media::spotify_status, media::media_status, lyrics_window::update_lyrics_view, lyrics_window::lyrics_view, lyrics_window::open_lyrics_window, lyrics_window::lyrics_passthrough, scene::open_listening_scene])
        .on_window_event(|window, event| {
            if window.label() == "main" && matches!(event, tauri::WindowEvent::Destroyed) { window.app_handle().exit(0); }
        })
        .setup(|app| {
            let handle = app.handle().clone();
            app.listen("theme-changed", move |event| {
                let _ = handle.emit("desktop-theme-confirmed", event.payload());
            });
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building Auralis")
        .run(|app, event| {
            if matches!(event, tauri::RunEvent::Exit) { app.state::<keyboard::KeyboardState>().shutdown(); }
        });
}
use tauri::{Emitter, Listener, Manager};
