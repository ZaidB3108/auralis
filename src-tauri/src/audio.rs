use serde::Serialize;
use std::{sync::{Arc, Mutex, atomic::{AtomicBool, Ordering}}, thread, time::Duration};
use wasapi::*;

#[derive(Clone, Default, Serialize)]
pub struct Status {
    pub(crate) running: bool,
    pub(crate) level: f32,
    peak: f32,
    device: String,
    error: Option<String>,
}
struct Worker { stop: Arc<AtomicBool>, handle: thread::JoinHandle<()> }
#[derive(Default)]
pub struct AudioState { worker: Mutex<Option<Worker>>, pub(crate) status: Arc<Mutex<Status>> }
impl Drop for AudioState {
    fn drop(&mut self) {
        if let Ok(worker) = self.worker.get_mut() {
            if let Some(w) = worker.take() { w.stop.store(true, Ordering::Relaxed); let _ = w.handle.join(); }
        }
    }
}

#[tauri::command]
pub fn audio_status(state: tauri::State<AudioState>) -> Status { state.status.lock().unwrap().clone() }

#[tauri::command]
pub fn stop_audio(state: tauri::State<AudioState>) {
    let mut worker = state.worker.lock().unwrap();
    if let Some(w) = worker.take() { w.stop.store(true, Ordering::Relaxed); let _ = w.handle.join(); }
    let mut status = state.status.lock().unwrap();
    status.running = false; status.level = 0.0; status.peak = 0.0;
}

#[tauri::command]
pub fn start_audio(state: tauri::State<AudioState>) -> Result<(), String> {
    let mut worker = state.worker.lock().unwrap();
    if worker.as_ref().is_some_and(|w| !w.handle.is_finished()) { return Ok(()); }
    if let Some(w) = worker.take() { let _ = w.handle.join(); }
    *state.status.lock().unwrap() = Status::default();
    let stop = Arc::new(AtomicBool::new(false));
    let signal = stop.clone();
    let status = state.status.clone();
    let handle = thread::Builder::new().name("playback-meter".into()).spawn(move || {
        let result = capture(&signal, &status);
        let mut snapshot = status.lock().unwrap();
        snapshot.running = false; snapshot.level = 0.0; snapshot.peak = 0.0;
        snapshot.error = result.err().map(|e| format!("Playback capture failed: {e}. Stop and start again after checking your output device."));
    }).map_err(|e| e.to_string())?;
    *worker = Some(Worker { stop, handle });
    Ok(())
}

fn levels(bytes: &[u8]) -> (f32, f32) {
    let mut sum = 0.0_f64;
    let mut peak = 0.0_f32;
    let mut count = 0;
    for chunk in bytes.chunks_exact(4) {
        let value = f32::from_le_bytes(chunk.try_into().unwrap());
        if value.is_finite() { sum += (value as f64).powi(2); peak = peak.max(value.abs()); count += 1; }
    }
    (if count > 0 { (sum / count as f64).sqrt().min(1.0) as f32 } else { 0.0 }, peak.min(1.0))
}

fn capture(stop: &AtomicBool, status: &Mutex<Status>) -> Result<(), Box<dyn std::error::Error>> {
    initialize_mta().ok()?;
    // COM objects are confined to this worker and dropped before COM is uninitialized.
    struct ComGuard;
    impl Drop for ComGuard { fn drop(&mut self) { deinitialize(); } }
    let _com = ComGuard;
    let device = DeviceEnumerator::new()?.get_default_device(Direction::Render)?;
    let mut client = device.get_iaudioclient()?;
    let format = WaveFormat::new(32, 32, SampleType::Float, 48000, 2, None);
    client.initialize_client(&format, Direction::Capture, StreamMode::PollingShared { autoconvert: true, buffer_duration_hns: 1_000_000 }, None)?;
    let reader = client.get_audiocaptureclient()?;
    let mut bytes = vec![0; client.get_buffer_size()? as usize * format.get_blockalign() as usize];
    client.start_stream()?;
    { let mut s = status.lock().unwrap(); s.running = true; s.device = device.get_friendlyname()?; }
    let result = (|| -> Result<(), Box<dyn std::error::Error>> {
        while !stop.load(Ordering::Relaxed) {
            let mut sum = 0.0_f64; let mut count = 0; let mut peak = 0.0_f32;
            while reader.get_next_packet_size()?.unwrap_or(0) > 0 {
                let (frames, _) = reader.read_from_device(&mut bytes)?;
                let data = &bytes[..frames as usize * format.get_blockalign() as usize];
                let (rms, p) = levels(data);
                sum += (rms as f64).powi(2) * frames as f64; count += frames; peak = peak.max(p);
                if stop.load(Ordering::Relaxed) { break; }
            }
            { let mut s = status.lock().unwrap(); s.level = if count > 0 { (sum / count as f64).sqrt() as f32 } else { 0.0 }; s.peak = peak; }
            thread::sleep(Duration::from_millis(40));
        }
        Ok(())
    })();
    let _ = client.stop_stream();
    result
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn silence_and_empty_are_zero() { assert_eq!(levels(&[0; 32]), (0.0, 0.0)); assert_eq!(levels(&[]), (0.0, 0.0)); }
    #[test] fn rms_peak_and_invalid_samples() {
        let bytes: Vec<u8> = [0.5_f32, -0.5, f32::NAN].into_iter().flat_map(f32::to_le_bytes).collect();
        assert_eq!(levels(&bytes), (0.5, 0.5));
    }
    #[test]
    #[ignore = "Uses the current Windows playback device for a brief local smoke test"]
    fn playback_device_starts_and_stops() {
        let stop = Arc::new(AtomicBool::new(false));
        let status = Arc::new(Mutex::new(Status::default()));
        let signal = stop.clone(); let snapshot = status.clone();
        let worker = thread::spawn(move || capture(&signal, &snapshot).map_err(|e| e.to_string()));
        for _ in 0..100 {
            if status.lock().unwrap().running || worker.is_finished() { break; }
            thread::sleep(Duration::from_millis(50));
        }
        let started = status.lock().unwrap().running;
        stop.store(true, Ordering::Relaxed);
        worker.join().unwrap().unwrap();
        assert!(started, "Playback stream did not start");
    }
}
