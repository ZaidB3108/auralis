import { useEffect, useState } from "react";
import AudioPanel from "./AudioPanel";
import LyricsPanel from "./LyricsPanel";
import { announceTheme, onDesktopThemeConfirmed, onThemeChanged, requestGreeting } from "./tauri";

type Theme = "midnight" | "aurora" | "ember";
type Settings = { theme: Theme; startWithWindows: boolean; showNowPlaying: boolean; lyricSize: number };

const saved = localStorage.getItem("auralis-settings");
const initial: Settings = saved ? JSON.parse(saved) : {
  theme: "midnight", startWithWindows: false, showNowPlaying: true, lyricSize: 24
};

export default function App() {
  const [settings, setSettings] = useState<Settings>(initial);
  const [message, setMessage] = useState("Ready for Phase 1.");

  useEffect(() => { localStorage.setItem("auralis-settings", JSON.stringify(settings)); }, [settings]);
  useEffect(() => { document.documentElement.dataset.theme = settings.theme; announceTheme(settings.theme); }, [settings.theme]);
  useEffect(() => { let unlisten: () => void = () => {}; onThemeChanged(theme => setMessage(`Theme event received: ${theme}`)).then(fn => { unlisten = fn; }); return () => unlisten(); }, []);
  useEffect(() => { let unlisten: () => void = () => {}; onDesktopThemeConfirmed(() => setMessage("Theme event confirmed by Rust.")).then(fn => { unlisten = fn; }); return () => unlisten(); }, []);

  const patch = (value: Partial<Settings>) => setSettings(current => ({ ...current, ...value }));

  return <main className="app-shell">
    <header><div><p className="eyebrow">AURALIS · PHASE 3</p><h1>Ambient sound, beautifully in sync.</h1><p className="lede">A calm home for sound, light, and lyrics.</p></div></header>
    <LyricsPanel fontSize={settings.lyricSize} />
    <AudioPanel />
    <section className="settings" aria-label="Settings"><div className="section-title"><div><p className="eyebrow">PREFERENCES</p><h2>Make it yours</h2></div></div>
      <label>Visual atmosphere<select value={settings.theme} onChange={e => patch({ theme: e.target.value as Theme })}><option value="midnight">Midnight</option><option value="aurora">Aurora</option><option value="ember">Ember</option></select></label>
      <Toggle label="Launch when I sign in" checked={settings.startWithWindows} onChange={startWithWindows => patch({ startWithWindows })} />
      <Toggle label="Show now-playing details" checked={settings.showNowPlaying} onChange={showNowPlaying => patch({ showNowPlaying })} />
      <label>Lyric text size <output>{settings.lyricSize}px</output><input type="range" min="16" max="40" value={settings.lyricSize} onChange={e => patch({ lyricSize: Number(e.target.value) })} /></label>
    </section>
    <section className="bridge"><div><p className="eyebrow">TAURI BRIDGE</p><h2>Desktop connection check</h2><p>{message}</p></div><button onClick={async () => setMessage(await requestGreeting("Auralis"))}>Call Rust command</button></section>
  </main>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="toggle"><span>{label}</span><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} /><b aria-hidden="true" /></label>;
}
