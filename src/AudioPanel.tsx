import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "./tauri";
import "./audio.css";
import LightingPreview from "./LightingPreview";

type Status = { running: boolean; level: number; peak: number; device: string; error: string | null };
const idle: Status = { running: false, level: 0, peak: 0, device: "", error: null };

export default function AudioPanel() {
  const [status, setStatus] = useState(idle);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!isTauri) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const next = await invoke<Status>("audio_status");
        if (!disposed) setStatus(next);
      } catch (e) { if (!disposed) setError(String(e)); }
      finally { if (!disposed) timer = setTimeout(poll, 100); }
    }
    void poll();
    return () => { disposed = true; clearTimeout(timer); };
  }, []);

  async function toggle() {
    setPending(true); setError("");
    try { await invoke(status.running ? "stop_audio" : "start_audio"); }
    catch (e) { setError(String(e)); }
    finally { setPending(false); }
  }
  const db = status.level > 0 ? Math.max(-60, 20 * Math.log10(status.level)) : -60;
  return <section className="settings audio-panel" aria-label="Playback audio">
    <div className="section-title"><div><p className="eyebrow">WINDOWS PLAYBACK</p><h2>{status.running ? "Listening to your playback" : "Bring your sound to life"}</h2></div>
      <button disabled={!isTauri || pending} onClick={() => void toggle()}>{pending ? "Please wait…" : status.running ? "Stop listening" : "Start listening"}</button></div>
    <p>Measures sound playing through your default speakers or headphones. No microphone, recording, or uploads. Listening starts only when you choose.</p>
    <LightingPreview level={status.level} running={status.running} />
    <label>Playback level <meter min={-60} max={0} value={db} aria-label="Playback level in decibels relative to full scale" /></label>
    <p>{status.running ? `Output: ${status.device} · Peak: ${Math.round(status.peak * 100)}%` : "Play music, then select Start listening."}</p>
    <p>Changed your output device? Stop and start listening again. Spotify lyrics work independently of audio capture.</p>
    {!isTauri && <p>Audio capture is available in the Windows app. This browser preview shows the interface only.</p>}
    {(error || status.error) && <p role="alert">{error || status.error}</p>}
  </section>;
}
