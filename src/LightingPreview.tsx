import { useEffect, useState } from "react";
import KeyboardSync from "./KeyboardSync";
import BorderControls from "./BorderControls";

type Lighting = { color: string; accent: string; brightness: number; sensitivity: number; fade: number; mode: "solid" | "blend"; test: boolean };
const defaults: Lighting = { color: "#8797ff", accent: "#ef78ba", brightness: 70, sensitivity: 2, fade: 700, mode: "blend", test: false };
const key = "auralis-lighting-v1";
function load(): Lighting {
  try {
    const s = JSON.parse(localStorage.getItem(key) || "null");
    if (!s || typeof s !== "object") return defaults;
    const number = (name: string, min: number, max: number, fallback: number) => typeof s[name] === "number" && Number.isFinite(s[name]) ? Math.max(min, Math.min(max, s[name])) : fallback;
    const color = (name: string, fallback: string) => typeof s[name] === "string" && /^#[0-9a-f]{6}$/i.test(s[name]) ? s[name] : fallback;
    return { color: color("color", defaults.color), accent: color("accent", defaults.accent), brightness: number("brightness", 0, 100, 70), sensitivity: number("sensitivity", .5, 8, 2), fade: number("fade", 150, 2000, 700), mode: s.mode === "solid" ? "solid" : "blend", test: false };
  } catch { return defaults; }
}
function blend(a: string, b: string, weight: number) {
  const channels = [1, 3, 5].map(i => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - weight) + parseInt(b.slice(i, i + 2), 16) * weight));
  return `rgb(${channels.join(",")})`;
}

export default function LightingPreview({ level, running }: { level: number; running: boolean }) {
  const [settings, setSettings] = useState(load);
  const [saveError, setSaveError] = useState(false);
  const patch = (value: Partial<Lighting>) => setSettings(s => ({ ...s, ...value }));
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify({ ...settings, test: false })); setSaveError(false); }
    catch { setSaveError(true); }
  }, [settings]);
  const energy = settings.test ? .55 : running ? Math.min(1, Math.max(0, level) * settings.sensitivity) : 0;
  const color = settings.mode === "blend" ? blend(settings.color, settings.accent, energy) : settings.color;
  const opacity = energy * settings.brightness / 100;
  const presets = [
    { name: "Aurora", color: "#51d5bb", accent: "#9b7aff" },
    { name: "Sunset", color: "#ffb55e", accent: "#f25e9b" },
    { name: "Ocean", color: "#397dff", accent: "#5de1f5" }
  ];
  return <div className="lighting-settings">
    <div className="audio-preview"><div aria-hidden="true" className="light-wash" style={{ backgroundColor: color, opacity, transitionDuration: `${settings.fade}ms` }} /><div className="preview-caption"><span>{settings.test ? "Color test · not live audio" : "Ambient preview"}</span><strong>{running && !settings.test ? "Live playback" : settings.test ? "Previewing" : "Stopped"}</strong></div></div>
    <p>Choose a single color or let the sound blend between two colors. Louder audio makes the preview brighter.</p>
    <div className="light-presets" aria-label="Color presets">{presets.map(p => <button key={p.name} type="button" onClick={() => patch({ color: p.color, accent: p.accent, mode: "blend" })}>{p.name}</button>)}</div>
    <div className="light-grid">
      <label>Lighting style<select value={settings.mode} onChange={e => patch({ mode: e.target.value as Lighting["mode"] })}><option value="solid">Single color</option><option value="blend">Blend with sound</option></select></label>
      <label>Base color<input type="color" value={settings.color} onChange={e => patch({ color: e.target.value })} /><span>{settings.color.toUpperCase()}</span></label>
      {settings.mode === "blend" && <label>Louder sound color<input type="color" value={settings.accent} onChange={e => patch({ accent: e.target.value })} /><span>{settings.accent.toUpperCase()}</span></label>}
    </div>
    <label>Maximum brightness: {settings.brightness}%<input type="range" min="0" max="100" value={settings.brightness} onChange={e => patch({ brightness: Number(e.target.value) })} /></label>
    <label>Sound sensitivity: {settings.sensitivity.toFixed(1)}×<input type="range" min="0.5" max="8" step="0.5" value={settings.sensitivity} onChange={e => patch({ sensitivity: Number(e.target.value) })} /></label>
    <label>Fade time: {(settings.fade / 1000).toFixed(2)} seconds<input type="range" min="150" max="2000" step="50" value={settings.fade} onChange={e => patch({ fade: Number(e.target.value) })} /></label>
    <div className="light-presets"><button type="button" aria-pressed={settings.test} onClick={() => patch({ test: !settings.test })}>{settings.test ? "End color test" : "Test colors without audio"}</button><button type="button" onClick={() => setSettings({ ...defaults })}>Reset lighting</button></div>
    <p>{saveError ? "Your browser could not save lighting preferences. Changes will last for this session." : "Lighting preferences are saved automatically. Color test resets when you reopen the app."}</p>
    <BorderControls settings={settings} />
    <KeyboardSync settings={settings} />
  </div>;
}
