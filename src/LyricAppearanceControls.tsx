import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "./tauri";
import { useLyricAppearance, defaults } from "./lyricAppearance";
export default function LyricAppearanceControls() {
  const { appearance: a, update, error } = useLyricAppearance();
  const [message, setMessage] = useState("");
  async function passthrough(enabled: boolean) {
    try { await invoke("lyrics_passthrough", { enabled }); setMessage(enabled ? "Clicks now pass through. Use Unlock overlay here to move or close it." : "Overlay unlocked. Drag the Move handle to position it."); }
    catch (e) { setMessage(String(e)); }
  }
  return <details className="lyric-customize" open><summary>Desktop lyrics appearance</summary>
    <div className="light-grid">
      <label>Presentation<select value={a.style} onChange={e => update({ style: e.target.value as "focus" | "depth" })}><option value="depth">Depth stack</option><option value="focus">Focus</option></select></label>
      <label>Current line<input type="color" value={a.primary} onChange={e => update({ primary: e.target.value })} /></label>
      <label>Surrounding lines<input type="color" value={a.secondary} onChange={e => update({ secondary: e.target.value })} /></label>
      <label>Glow color<input type="color" value={a.glow} onChange={e => update({ glow: e.target.value })} /></label>
    </div>
    <label>Overlay text size: {a.size}px<input type="range" min="28" max="84" value={a.size} onChange={e => update({ size: Number(e.target.value) })} /></label>
    <label>Text glow: {a.strength}%<input type="range" min="0" max="80" value={a.strength} onChange={e => update({ strength: Number(e.target.value) })} /></label>
    <div className="light-presets"><button disabled={!isTauri} onClick={() => void passthrough(true)}>Let clicks pass through</button><button disabled={!isTauri} onClick={() => void passthrough(false)}>Unlock overlay</button><button onClick={() => update(defaults)}>Reset appearance</button></div>
    <p>Open Desktop lyrics, then drag its Move handle. Hover over the lyrics to reveal controls; resize from its edges. Appearance is saved. Click-through resets when the overlay is reopened.</p>
    <p>Uses line-level timing. No simulated word timing or lock-screen support.</p>
    {(message || error) && <p role="status">{error || message}</p>}
  </details>;
}
