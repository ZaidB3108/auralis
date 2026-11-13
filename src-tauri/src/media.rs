use serde::Serialize;
use windows::Media::Control::{GlobalSystemMediaTransportControlsSessionManager as Sessions, GlobalSystemMediaTransportControlsSessionPlaybackStatus as Playback};

#[derive(Serialize, Debug, Clone)]
pub struct Song { source: String, title: String, artist: String, album: String, position: f64, duration: f64, playing: bool, rate: f64 }

#[derive(Serialize, Debug)]
pub struct MediaSnapshot { song: Option<Song>, sources: Vec<MediaSource> }
#[derive(Serialize, Debug)]
pub struct MediaSource { source: String, title: String }
fn matches_player(source: &str, player: &str) -> bool {
    let source = source.to_ascii_lowercase();
    if player == "spotify" { return source.contains("spotify"); }
    ["chrome", "msedge", "microsoftedge", "firefox", "brave", "opera", "vivaldi", "chromium"].iter().any(|name| source.contains(name))
}

fn read_media(player: &str, chosen: Option<&str>) -> Result<MediaSnapshot, String> {
    if !["spotify", "browser"].contains(&player) { return Err("Unknown media player".into()); }
    wasapi::initialize_mta().ok().map_err(|e| e.to_string())?;
    struct Com;
    impl Drop for Com { fn drop(&mut self) { wasapi::deinitialize(); } }
    let _com = Com;
    let read = || -> windows::core::Result<MediaSnapshot> {
        let sessions = Sessions::RequestAsync()?.join()?.GetSessions()?;
        let mut songs = Vec::new();
        for i in 0..sessions.Size()? {
            let session = sessions.GetAt(i)?;
            let source = session.SourceAppUserModelId()?.to_string();
            if !matches_player(&source, player) { continue; }
            let Ok(info) = session.TryGetMediaPropertiesAsync().and_then(|op| op.join()) else { continue; };
            let (Ok(timeline), Ok(playback)) = (session.GetTimelineProperties(), session.GetPlaybackInfo()) else { continue; };
            let playing = playback.PlaybackStatus()? == Playback::Playing;
            let rate = playback.PlaybackRate().and_then(|r| r.Value()).unwrap_or(1.0);
            let rate = if rate.is_finite() && rate > 0.0 { rate } else { 1.0 };
            let start = timeline.StartTime()?.Duration as f64 / 10_000_000.0;
            let duration = (timeline.EndTime()?.Duration as f64 / 10_000_000.0 - start).max(0.0);
            let mut position = timeline.Position()?.Duration as f64 / 10_000_000.0 - start;
            // Windows timestamp uses 100 ns ticks since 1601, not Unix time.
            if playing {
                let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs_f64()).unwrap_or(0.0) + 11_644_473_600.0;
                let updated = timeline.LastUpdatedTime()?.UniversalTime as f64 / 10_000_000.0;
                if updated > 0.0 { position += (now - updated).max(0.0) * rate; }
            }
            songs.push(Song { source, title: info.Title()?.to_string(), artist: info.Artist()?.to_string(), album: info.AlbumTitle()?.to_string(), position: position.max(0.0).min(duration.max(0.0)), duration, playing, rate });
        }
        let sources = songs.iter().map(|s| MediaSource { source: s.source.clone(), title: s.title.clone() }).collect();
        let song = if let Some(chosen) = chosen.filter(|s| !s.is_empty()) {
            songs.iter().find(|s| s.source == chosen).cloned()
        } else { songs.iter().find(|s| s.playing).or_else(|| songs.first()).cloned() };
        Ok(MediaSnapshot { song, sources })
    };
    read().map_err(|e| format!("Could not read Windows media playback: {e}"))
}

#[tauri::command]
pub async fn spotify_status() -> Result<Option<Song>, String> {
    tauri::async_runtime::spawn_blocking(|| read_media("spotify", None).map(|s| s.song)).await.map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn media_status(player: String, source: Option<String>) -> Result<MediaSnapshot, String> {
    tauri::async_runtime::spawn_blocking(move || read_media(&player, source.as_deref())).await.map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    #[test]
    #[ignore = "Reads current Spotify metadata from Windows"]
    fn windows_media_access() { let result = super::read_media("spotify", None).unwrap(); println!("Spotify session available: {}", result.song.is_some()); }
    #[test]
    fn filters_players() {
        assert!(super::matches_player("Spotify.exe", "spotify"));
        assert!(!super::matches_player("Spotify.exe", "browser"));
        for source in ["chrome.exe", "Microsoft.MicrosoftEdge.Stable_8wekyb3d8bbwe!App", "msedge.exe", "firefox.exe", "Brave.exe"] {
            assert!(super::matches_player(source, "browser"));
        }
        assert!(!super::matches_player("SomeMusicPlayer.exe", "browser"));
        assert!(super::read_media("invalid", None).is_err());
    }
    #[test]
    #[ignore = "Reads browser media sessions from Windows without logging titles"]
    fn browser_media_access() { let result = super::read_media("browser", None).unwrap(); println!("Browser sessions: {}; timeline available: {}", result.sources.len(), result.song.is_some_and(|s| s.duration > 0.0)); }
}
