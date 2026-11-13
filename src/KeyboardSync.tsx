import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "./tauri";

type Settings = { color: string; accent: string; brightness: number; sensitivity: number; fade: number; mode: string };
type Status = { enabled: boolean; error: string | null };
export default function KeyboardSync({ settings }: { settings: Settings }) {
  const [status, setStatus] = useState<Status>({ enabled: false, error: null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const latest = useRef(settings);
  latest.current = settings;
  const changing = useRef(false);
  useEffect(() => {
    if (!isTauri) return;
    let closed = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try { const next = await invoke<Status>("keyboard_status"); if (!closed && !changing.current) setStatus(next); }
      catch (e) { if (!closed) setError(String(e)); }
      finally { if (!closed) timer = setTimeout(poll, 500); }
    }
    void poll();
    return () => {
      closed = true; clearTimeout(timer);
      void invoke("configure_keyboard", { enabled: false, settings: latest.current }).catch(() => {});
    };
  }, []);
  // Updating preferences never enables sync. Only the explicit switch can do that.
  useEffect(() => {
    if (!isTauri) return;
    const timer = setTimeout(() => {
      void invoke("update_keyboard_settings", { settings }).catch(e => setError(String(e)));
    }, 250);
    return () => clearTimeout(timer);
  }, [settings]);
  async function toggle() {
    changing.current = true; setBusy(true); setError("");
    try {
      await invoke("configure_keyboard", { enabled: !status.enabled, settings: latest.current });
      setStatus(await invoke<Status>("keyboard_status"));
    } catch (e) { setError(String(e)); }
    finally { changing.current = false; setBusy(false); }
  }
  return <section className="keyboard-sync" aria-label="ASUS keyboard lighting">
    <h3>ASUS TUF keyboard</h3>
    <button type="button" disabled={!isTauri || busy} aria-pressed={status.enabled} onClick={() => void toggle()}>{busy ? "Updating…" : status.enabled ? "Turn off keyboard sync" : "Sync keyboard with audio"}</button>
    <p role="status">{status.enabled ? "Keyboard sync is on. Start listening to make it respond to playback." : "Keyboard sync is off."}</p>
    <p>Uses your colors, brightness, sensitivity, and fade time above. The whole keyboard changes together. Stopping playback capture, turning sync off, or closing normally returns it to your base color at the selected brightness—not your previous Armoury Crate effect.</p>
    <p>Sync starts off each launch. The color-test button affects only the on-screen preview. Armoury Crate may override colors; no ASUS services are changed. After a crash or forced close, reapply your lighting in Armoury Crate.</p>
    {!isTauri && <p>Open the Windows app to control your keyboard.</p>}
    {(error || status.error) && <p role="alert">{error || status.error}</p>}
  </section>;
}
