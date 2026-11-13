//! Fixed ASUS TUF RGB endpoint, confirmed on FX608JMR. No arbitrary device writes.
//! Protocol reference: https://github.com/seerge/g-helper/blob/main/app/AsusACPI.cs
use serde::{Deserialize, Serialize};
use std::{ffi::c_void, sync::{Arc, Mutex, atomic::{AtomicBool, Ordering}}, thread, time::Duration};

#[derive(Clone, Deserialize)]
pub struct Settings { color: String, accent: String, brightness: f32, sensitivity: f32, fade: f32, mode: String }
#[derive(Clone, Default, Serialize)]
pub struct KeyboardStatus { enabled: bool, error: Option<String> }
#[derive(Default)]
struct Control { settings: Option<Settings>, status: KeyboardStatus }
pub struct KeyboardState { control: Arc<Mutex<Control>>, quit: Arc<AtomicBool>, worker: Mutex<Option<thread::JoinHandle<()>>> }

fn rgb(hex: &str) -> Result<[f32; 3], String> {
    if hex.len() != 7 || !hex.starts_with('#') || !hex.as_bytes()[1..].iter().all(u8::is_ascii_hexdigit) { return Err("Choose a valid RGB color.".into()); }
    Ok([1, 3, 5].map(|i| u8::from_str_radix(&hex[i..i+2], 16).unwrap() as f32))
}
impl Settings {
    fn validate(&self) -> Result<(), String> {
        rgb(&self.color)?; rgb(&self.accent)?;
        if !self.brightness.is_finite() || !(0.0..=100.0).contains(&self.brightness)
            || !self.sensitivity.is_finite() || !(0.5..=8.0).contains(&self.sensitivity)
            || !self.fade.is_finite() || !(150.0..=2000.0).contains(&self.fade)
            || !["solid", "blend"].contains(&self.mode.as_str()) { return Err("Lighting settings are out of range.".into()); }
        Ok(())
    }
    fn target(&self, level: Option<f32>) -> [f32; 3] {
        let base = rgb(&self.color).unwrap(); let accent = rgb(&self.accent).unwrap();
        let energy = level.map(|v| (v * self.sensitivity).clamp(0.0, 1.0)).unwrap_or(1.0);
        let blend = if self.mode == "blend" && level.is_some() { energy } else { 0.0 };
        std::array::from_fn(|i| (base[i] * (1.0-blend) + accent[i] * blend) * energy * self.brightness / 100.0)
    }
}

#[link(name = "kernel32")]
extern "system" {
    fn CreateFileW(name: *const u16, access: u32, share: u32, security: *const c_void, disposition: u32, flags: u32, template: *mut c_void) -> *mut c_void;
    fn DeviceIoControl(handle: *mut c_void, code: u32, input: *const u8, input_len: u32, output: *mut u8, output_len: u32, returned: *mut u32, overlapped: *mut c_void) -> i32;
    fn CloseHandle(handle: *mut c_void) -> i32;
}
struct Keyboard(*mut c_void);
impl Keyboard {
    fn open() -> Result<Self, String> {
        let path: Vec<u16> = "\\\\.\\ATKACPI\0".encode_utf16().collect();
        let handle = unsafe { CreateFileW(path.as_ptr(), 0xc0000000, 3, std::ptr::null(), 3, 0x80, std::ptr::null_mut()) };
        if handle as isize == -1 { return Err(format!("Cannot open ASUS keyboard: {}", std::io::Error::last_os_error())); }
        Ok(Self(handle))
    }
    fn set(&self, rgb: [u8; 3]) -> Result<(), String> {
        let mut packet = [0u8; 18];
        packet[0..4].copy_from_slice(&0x53564544u32.to_le_bytes());
        packet[4..8].copy_from_slice(&10u32.to_le_bytes());
        packet[8..12].copy_from_slice(&0x00100056u32.to_le_bytes());
        packet[12..18].copy_from_slice(&[0xb4, 0, rgb[0], rgb[1], rgb[2], 0xeb]);
        let mut response = [0u8; 16]; let mut returned = 0;
        let ok = unsafe { DeviceIoControl(self.0, 0x0022240c, packet.as_ptr(), 18, response.as_mut_ptr(), 16, &mut returned, std::ptr::null_mut()) };
        if ok == 0 { return Err(format!("ASUS lighting command failed: {}", std::io::Error::last_os_error())); }
        if returned < 4 || u32::from_le_bytes(response[..4].try_into().unwrap()) != 1 { return Err("ASUS did not accept the lighting command. Sync stopped.".into()); }
        Ok(())
    }
}
impl Drop for Keyboard { fn drop(&mut self) { unsafe { CloseHandle(self.0); } } }

impl KeyboardState {
    pub fn new(audio: Arc<Mutex<crate::audio::Status>>) -> Self {
        let control = Arc::new(Mutex::new(Control::default()));
        let quit = Arc::new(AtomicBool::new(false));
        let shared = control.clone(); let exit = quit.clone();
        let worker = thread::spawn(move || {
            let mut device: Option<Keyboard> = None;
            let mut current = [0.0_f32; 3]; let mut previous = None;
            loop {
                let mut c = shared.lock().unwrap();
                let closing = exit.load(Ordering::Relaxed);
                let result: Result<(), String> = (|| {
                    if !c.status.enabled || closing {
                        if let Some(d) = device.take() {
                            if let Some(s) = &c.settings { d.set(s.target(None).map(|v| v.round() as u8))?; }
                        }
                        previous = None;
                        return Ok(());
                    }
                    if device.is_none() { device = Some(Keyboard::open()?); }
                    let s = c.settings.as_ref().unwrap();
                    let a = audio.lock().unwrap();
                    let target = s.target(if a.running { Some(a.level) } else { None });
                    drop(a);
                    let alpha = 1.0 - (-200.0 / s.fade).exp();
                    for i in 0..3 { current[i] += (target[i] - current[i]) * alpha; }
                    let color = current.map(|v| v.round().clamp(0.0, 255.0) as u8);
                    if previous != Some(color) { device.as_ref().unwrap().set(color)?; previous = Some(color); }
                    Ok(())
                })();
                if let Err(e) = result { c.status.enabled = false; c.status.error = Some(e); device = None; }
                drop(c);
                if closing { break; }
                // At most five commands per second; identical colors are skipped.
                thread::sleep(Duration::from_millis(200));
            }
        });
        Self { control, quit, worker: Mutex::new(Some(worker)) }
    }
    pub fn shutdown(&self) { self.quit.store(true, Ordering::Relaxed); if let Some(w) = self.worker.lock().unwrap().take() { let _ = w.join(); } }
}
impl Drop for KeyboardState { fn drop(&mut self) { self.shutdown(); } }

#[tauri::command]
pub fn keyboard_status(state: tauri::State<KeyboardState>) -> KeyboardStatus { state.control.lock().unwrap().status.clone() }
#[tauri::command]
pub fn update_keyboard_settings(settings: Settings, state: tauri::State<KeyboardState>) -> Result<(), String> {
    settings.validate()?;
    state.control.lock().unwrap().settings = Some(settings);
    Ok(())
}
#[tauri::command]
pub fn configure_keyboard(enabled: bool, settings: Settings, state: tauri::State<KeyboardState>) -> Result<(), String> {
    settings.validate()?;
    let mut c = state.control.lock().unwrap();
    c.settings = Some(settings); c.status = KeyboardStatus { enabled, error: None };
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    fn settings() -> Settings { Settings { color: "#ff0000".into(), accent: "#0000ff".into(), brightness: 50.0, sensitivity: 2.0, fade: 700.0, mode: "blend".into() } }
    #[test] fn validates_colors_and_limits() { assert!(rgb("#ff0080").is_ok()); assert!(rgb("#ééé").is_err()); let mut s = settings(); s.fade = f32::NAN; assert!(s.validate().is_err()); }
    #[test] fn silence_full_audio_and_idle_color() { let s = settings(); assert_eq!(s.target(Some(0.0)), [0.0; 3]); assert_eq!(s.target(Some(1.0)), [0.0, 0.0, 127.5]); assert_eq!(s.target(None), [127.5, 0.0, 0.0]); }
    #[test] fn solid_mode_retains_base_color() { let mut s = settings(); s.mode = "solid".into(); assert_eq!(s.target(Some(1.0)), [127.5, 0.0, 0.0]); }
    #[test]
    #[ignore = "Requires the ASUS keyboard driver; opens it without changing lighting"]
    fn driver_can_be_opened() { let _device = Keyboard::open().unwrap(); }
}
