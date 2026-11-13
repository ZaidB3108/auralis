use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

#[tauri::command]
pub async fn open_listening_scene(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("listening-scene") { window.show().map_err(|e| e.to_string())?; window.set_focus().map_err(|e| e.to_string())?; return Ok(()); }
    let window = WebviewWindowBuilder::new(&app, "listening-scene", WebviewUrl::App("index.html#listening-scene".into()))
        .title("Auralis · Listening Scene").decorations(false).fullscreen(true)
        .background_color(tauri::webview::Color(5, 6, 9, 255))
        .build().map_err(|e| e.to_string())?;
    // Avoid a second desktop glow or floating lyrics sitting above the scene.
    let mut hidden = Vec::new();
    for label in ["desktop-border", "floating-lyrics"] {
        if let Some(other) = app.get_webview_window(label) {
            if other.is_visible().unwrap_or(false) && other.hide().is_ok() { hidden.push(label); }
        }
    }
    let handle = app.clone();
    window.on_window_event(move |event| {
        if matches!(event, tauri::WindowEvent::Destroyed) {
            for label in &hidden { if let Some(other) = handle.get_webview_window(label) { let _ = other.show(); } }
        }
    });
    Ok(())
}
