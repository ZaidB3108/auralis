import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "./tauri";
import "./border.css";

type Lighting = { color: string; accent: string; mode: string; brightness: number; sensitivity: number; fade: number };
function loadDimensions() {
  try {
    const s = JSON.parse(localStorage.getItem("auralis-border-v1") || "null");
    return { thickness: typeof s?.thickness === "number" && Number.isFinite(s.thickness) ? Math.max(1, Math.min(20, s.thickness)) : 4,
      glow: typeof s?.glow === "number" && Number.isFinite(s.glow) ? Math.max(0, Math.min(80, s.glow)) : 30 };
  } catch { return { thickness: 4, glow: 30 }; }
}
export default function BorderControls({ settings }: { settings: Lighting }) {
  const [dimensions, setDimensions] = useState(loadDimensions);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const changing = useRef(false);
  useEffect(() => {
    try { localStorage.setItem("auralis-border-v1", JSON.stringify(dimensions)); }
    catch { setError("Could not save border dimensions. They will last for this session."); }
  }, [dimensions]);
  useEffect(() => {
    if (!isTauri) return;
    let disposed = false; let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try { const next = await invoke<boolean>("border_enabled"); if (!disposed && !changing.current) setEnabled(next); }
      catch (e) { if (!disposed) setError(String(e)); }
      finally { if (!disposed) timer = setTimeout(poll, 1000); }
    }
    void poll(); return () => { disposed = true; clearTimeout(timer); };
  }, []);
  useEffect(() => {
    if (!isTauri) return;
    const timer = setTimeout(() => { void invoke("update_border", { settings: { ...settings, ...dimensions } }).catch(e => setError(String(e))); }, 100);
    return () => clearTimeout(timer);
  }, [settings, dimensions]);
  async function toggle() {
    changing.current = true; setBusy(true); setError("");
    try { await invoke("set_border", { enabled: !enabled, settings: { ...settings, ...dimensions } }); setEnabled(!enabled); }
    catch (e) { setError(String(e)); }
    finally { changing.current = false; setBusy(false); }
  }
  return <section className="border-controls" aria-label="Desktop border lighting">
    <h3>Desktop edge glow</h3>
    <button type="button" disabled={!isTauri || busy} aria-pressed={enabled} onClick={() => void toggle()}>{busy ? "Updating…" : enabled ? "Turn off desktop glow" : "Show desktop glow"}</button>
    <p role="status">{enabled ? "Desktop glow is on for your primary display." : "Desktop glow is off."}</p>
    <label>Border thickness: {dimensions.thickness}px<input type="range" min="1" max="20" value={dimensions.thickness} onChange={e => setDimensions(d => ({ ...d, thickness: Number(e.target.value) }))} /></label>
    <label>Glow spread: {dimensions.glow}px<input type="range" min="0" max="80" value={dimensions.glow} onChange={e => setDimensions(d => ({ ...d, glow: Number(e.target.value) }))} /></label>
    <p>Uses your colors, brightness, sensitivity, and fade time above. Choose Blend for two-color edges. Play audio and start listening to make it pulse; a faint glow remains during silence. Clicks pass through to your apps.</p>
    <p>Starts off each launch and closes with Auralis. After changing display layout or scaling, turn the glow off and on. Windows lock screens and exclusive fullscreen games are not supported. Keyboard sync is independent.</p>
    {!isTauri && <p>Open the Windows app to show the desktop border.</p>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
