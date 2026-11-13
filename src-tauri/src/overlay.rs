use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

#[derive(Clone, Deserialize, Serialize)]
pub struct BorderSettings {
    color: String, accent: String, mode: String,
    brightness: f32, sensitivity: f32, fade: f32,
    thickness: f32, glow: f32,
}
impl Default for BorderSettings {
    fn default() -> Self {
        Self { color: "#8797ff".into(), accent: "#ef78ba".into(), mode: "blend".into(), brightness: 70.0, sensitivity: 2.0, fade: 700.0, thickness: 4.0, glow: 30.0 }
    }
}
impl BorderSettings {
    fn validate(&self) -> Result<(), String> {
        for color in [&self.color, &self.accent] {
            if color.len() != 7 || !color.starts_with('#') || !color.as_bytes()[1..].iter().all(u8::is_ascii_hexdigit) { return Err("Invalid border color".into()); }
        }
        for (value, min, max) in [(self.brightness, 0.0, 100.0), (self.sensitivity, 0.5, 8.0), (self.fade, 150.0, 2000.0), (self.thickness, 1.0, 20.0), (self.glow, 0.0, 80.0)] {
            if !value.is_finite() || value < min || value > max { return Err("Border setting is out of range".into()); }
        }
        if !["solid", "blend"].contains(&self.mode.as_str()) { return Err("Invalid border style".into()); }
        Ok(())
    }
}
#[derive(Default)]
pub struct OverlayState(pub Mutex<BorderSettings>);

#[derive(Serialize)]
pub struct BorderFrame { settings: BorderSettings, running: bool, level: f32 }
#[tauri::command]
pub fn border_frame(state: tauri::State<OverlayState>, audio: tauri::State<crate::audio::AudioState>) -> BorderFrame {
    let settings = state.0.lock().unwrap().clone();
    let audio = audio.status.lock().unwrap();
    BorderFrame { settings, running: audio.running, level: audio.level }
}
#[tauri::command]
pub fn border_enabled(app: tauri::AppHandle) -> bool { app.get_webview_window("desktop-border").is_some() }
#[tauri::command]
pub fn update_border(settings: BorderSettings, state: tauri::State<OverlayState>) -> Result<(), String> {
    settings.validate()?;
    *state.0.lock().unwrap() = settings;
    Ok(())
}
// Async commands run off the GUI thread, avoiding WebView2 window-creation deadlocks.
#[tauri::command]
pub async fn set_border(enabled: bool, settings: BorderSettings, app: tauri::AppHandle, state: tauri::State<'_, OverlayState>) -> Result<(), String> {
    settings.validate()?;
    *state.0.lock().unwrap() = settings;
    if !enabled {
        if let Some(window) = app.get_webview_window("desktop-border") { window.destroy().map_err(|e| e.to_string())?; }
        return Ok(());
    }
    if app.get_webview_window("desktop-border").is_some() { return Ok(()); }
    let monitor = app.primary_monitor().map_err(|e| e.to_string())?.ok_or("No primary display found")?;
    let window = WebviewWindowBuilder::new(&app, "desktop-border", WebviewUrl::App("index.html#desktop-border".into()))
        .title("Auralis desktop glow")
        .transparent(true).decorations(false).shadow(false)
        .always_on_top(true).skip_taskbar(true).resizable(false)
        .focused(false).focusable(false).visible(false)
        .build().map_err(|e| e.to_string())?;
    let setup = (|| -> tauri::Result<()> {
        window.set_ignore_cursor_events(true)?;
        window.set_position(*monitor.position())?;
        window.set_size(*monitor.size())?;
        window.show()?;
        Ok(())
    })();
    if let Err(e) = setup { let _ = window.destroy(); return Err(e.to_string()); }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn rejects_invalid_border_settings() {
        let mut s = BorderSettings::default(); assert!(s.validate().is_ok());
        s.glow = f32::NAN; assert!(s.validate().is_err());
        s.glow = 30.0; s.thickness = 200.0; assert!(s.validate().is_err());
        s.thickness = 4.0; s.color = "#ééé".into(); assert!(s.validate().is_err());
    }
}
