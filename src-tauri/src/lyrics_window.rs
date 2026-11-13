use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

#[derive(Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct View { title: String, artist: String, previous: String, current: String, next: String, font_size: f32, #[serde(default)] line_id: i32, #[serde(default)] words: Vec<String>, #[serde(default = "no_word")] active_word: i32, #[serde(default)] playing: bool }
fn no_word() -> i32 { -1 }
#[derive(Default)]
pub struct LyricsView(pub Mutex<View>);
#[tauri::command]
pub fn update_lyrics_view(view: View, state: tauri::State<LyricsView>) -> Result<(), String> {
    if !view.font_size.is_finite() || !(16.0..=40.0).contains(&view.font_size) { return Err("Invalid lyric size".into()); }
    if [&view.title, &view.artist, &view.previous, &view.current, &view.next].iter().any(|s| s.len() > 8000) { return Err("Lyric line too long".into()); }
    if view.words.len() > 200 || view.words.iter().any(|s| s.len() > 1000) || view.active_word < -1 || view.active_word >= view.words.len() as i32 { return Err("Invalid word timing view".into()); }
    *state.0.lock().unwrap() = view;
    Ok(())
}
#[tauri::command]
pub fn lyrics_view(state: tauri::State<LyricsView>) -> View { state.0.lock().unwrap().clone() }
#[tauri::command]
pub async fn open_lyrics_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("floating-lyrics") { window.show().map_err(|e| e.to_string())?; return Ok(()); }
    WebviewWindowBuilder::new(&app, "floating-lyrics", WebviewUrl::App("index.html#floating-lyrics".into()))
        .title("Auralis lyrics").inner_size(740.0, 430.0).min_inner_size(420.0, 280.0)
        .transparent(true).decorations(false).shadow(false).resizable(true)
        .always_on_top(true).focused(false).build().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn lyrics_passthrough(enabled: bool, app: tauri::AppHandle) -> Result<(), String> {
    let window = app.get_webview_window("floating-lyrics").ok_or("Open Desktop lyrics first.")?;
    window.set_ignore_cursor_events(enabled).map_err(|e| e.to_string())?;
    window.set_focusable(!enabled).map_err(|e| e.to_string())?;
    Ok(())
}
