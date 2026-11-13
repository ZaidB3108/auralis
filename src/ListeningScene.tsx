import { useEffect, useState, type CSSProperties } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri } from "./tauri";
import { useLyricAppearance } from "./lyricAppearance";
import DesktopBorder from "./DesktopBorder";
import ConstellationLyrics from "./ConstellationLyrics";
import "./scene.css";

type View = { title: string; artist: string; previous: string; current: string; next: string; words: string[]; activeWord: number; lineId: number; playing: boolean };
type Options = { style: "classic" | "constellation"; background: "night" | "haze"; symbols: boolean; panelHidden: boolean };
const fallback: View = { title: "Your listening space", artist: "Choose a song and lyrics in Auralis", previous: "", current: "Let the music find its words", next: "", words: [], activeWord: -1, lineId: -1, playing: false };
function loadOptions(): Options {
  try { const s = JSON.parse(localStorage.getItem("auralis-scene-v1") || "null"); return { style: s?.style === "classic" ? "classic" : "constellation", background: s?.background === "night" ? "night" : "haze", symbols: s?.symbols !== false, panelHidden: s?.panelHidden === true }; }
  catch { return { style: "constellation", background: "haze", symbols: true, panelHidden: false }; }
}

export default function ListeningScene() {
  const [view, setView] = useState<View>(fallback);
  const [options, setOptions] = useState(loadOptions);
  const [idle, setIdle] = useState(false);
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const { appearance: a, update } = useLyricAppearance();
  const demo = !isTauri && new URLSearchParams(location.search).get("sceneDemo") === "1";
  const patch = (value: Partial<Options>) => setOptions(s => ({ ...s, ...value }));
  useEffect(() => { try { localStorage.setItem("auralis-scene-v1", JSON.stringify(options)); } catch { setError("Scene preferences could not be saved."); } }, [options]);
  async function close() { if (isTauri) { try { await getCurrentWindow().close(); } catch (e) { setError(String(e)); } } else location.href = location.pathname; }
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const wake = () => { setIdle(false); clearTimeout(timer); timer = setTimeout(() => setIdle(true), 3500); };
    const key = (e: KeyboardEvent) => { wake(); if (e.key === "Escape") void close(); };
    window.addEventListener("pointermove", wake); window.addEventListener("pointerdown", wake); window.addEventListener("keydown", key); wake();
    return () => { clearTimeout(timer); window.removeEventListener("pointermove", wake); window.removeEventListener("pointerdown", wake); window.removeEventListener("keydown", key); };
  }, []);
  useEffect(() => {
    let disposed = false; let timer: ReturnType<typeof setTimeout>;
    let viewKey = "";
    const start = performance.now();
    async function poll() {
      try {
        if (isTauri) {
          const [v, b] = await Promise.all([invoke<View>("lyrics_view"), invoke<{ level: number; running: boolean; settings: { sensitivity: number; fade: number } }>("border_frame")]);
          if (disposed) return;
          const key = JSON.stringify(v); if (key !== viewKey) { viewKey = key; setView(v.current ? v : fallback); }
          setListening(b.running);
        } else if (demo) {
          const t = (performance.now() - start) / 1000;
          setView({ title: "After the daylight", artist: "Design preview · original sample text", previous: "Let the quiet carry us", current: "Under a sky of stars", next: "We find a little light", words: ["Under", "a", "sky", "of", "stars"], activeWord: Math.floor(t / .8) % 5, lineId: 1, playing: true });
        }
      } catch (e) { if (!disposed) { setError(String(e)); setListening(false); setView(fallback); } }
      finally { if (!disposed) timer = setTimeout(poll, 100); }
    }
    void poll();
    return () => { disposed = true; clearTimeout(timer); };
  }, [demo]);
  async function toggleAudio() {
    setBusy(true); setError("");
    try { await invoke(listening ? "stop_audio" : "start_audio"); }
    catch (e) { setError(String(e)); }
    finally { setBusy(false); }
  }
  const timed = !!view.words?.length;
  const style = { "--scene-ink": a.primary, "--scene-muted": a.secondary, "--scene-color": a.glow, "--scene-size": `${a.size * 1.5}px` } as CSSProperties;
  return <main className={`listening-scene scene-${options.background} ${idle ? "scene-idle" : ""}`} style={style}>
    <div className="scene-atmosphere" aria-hidden="true" />
    {demo ? <div className="scene-edge" aria-hidden="true" /> : <DesktopBorder />}
    <header className="scene-header"><span className="scene-brand">AURALIS <span>LISTENING SCENE</span></span><div className="scene-header-actions"><button aria-expanded={!options.panelHidden} aria-controls="scene-controls" onClick={() => patch({ panelHidden: !options.panelHidden })}>{options.panelHidden ? "Show panel" : "Hide panel"}</button><button onClick={() => void close()}>Exit scene <kbd>Esc</kbd></button></div></header>
    <div className="scene-song"><span className="scene-song-dot" /><div><h1>{view.title}</h1><p>{view.artist}</p></div><span className="scene-play-state">{view.playing ? "NOW PLAYING" : "PAUSED / WAITING"}</span></div>
    {options.style === "classic" ? <section className="scene-classic" aria-label="Classic lyrics"><div key={`${view.title}:${view.lineId}`} className="scene-line-arrival"><p className="scene-line-neighbor">{view.previous || " "}</p><p className="scene-line-current">{view.current}</p><p className="scene-line-neighbor">{view.next || " "}</p></div></section>
      : <ConstellationLyrics {...view} symbols={options.symbols} />}
    <footer id="scene-controls" className="scene-controls" hidden={options.panelHidden}>
      <div className="scene-style-switch" role="group" aria-label="Lyric style"><button aria-pressed={options.style === "classic"} onClick={() => patch({ style: "classic" })}>Classic lines</button><button aria-pressed={options.style === "constellation"} onClick={() => patch({ style: "constellation" })}>Constellation</button></div>
      <label>Backdrop<select value={options.background} onChange={e => patch({ background: e.target.value as Options["background"] })}><option value="night">Midnight</option><option value="haze">Soft haze</option></select></label>
      <label>Palette<select value="" onChange={e => { const colors = e.target.value === "amber" ? ["#ffdf8a", "#bc9a58", "#e7af32"] : e.target.value === "ice" ? ["#d5f4ff", "#89b5cf", "#53baf1"] : ["#ffd6e6", "#d2b8c8", "#f36ca4"]; update({ primary: colors[0], secondary: colors[1], glow: colors[2] }); }}><option value="" disabled>Custom / choose</option><option value="amber">Amber</option><option value="rose">Rose</option><option value="ice">Ice</option></select></label>
      <span className="scene-timing">Border uses your shared lighting colors and glow settings</span>
      <label className="scene-symbol-control"><input type="checkbox" checked={options.symbols} onChange={e => patch({ symbols: e.target.checked })} /> Symbols</label>
      <button disabled={!isTauri || busy} onClick={() => void toggleAudio()}>{listening ? "Stop light reaction" : "Start light reaction"}</button>
      <p className="scene-timing">{timed ? "Word-timed lyrics" : "Line-timed lyrics · enhanced LRC enables word highlighting"}{demo ? " · Design preview" : ""}</p>
    </footer>
    {error && <p className="scene-error" role="alert">{error}</p>}
  </main>;
}
