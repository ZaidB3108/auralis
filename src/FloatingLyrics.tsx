import { useEffect, useState, type CSSProperties } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useLyricAppearance } from "./lyricAppearance";
import { isTauri } from "./tauri";
import "./lyrics.css";
type View = { title: string; artist: string; previous: string; current: string; next: string; fontSize: number; lineId: number };
export default function FloatingLyrics() {
  const [view, setView] = useState<View | null>(null);
  const { appearance: a } = useLyricAppearance();
  const [error, setError] = useState("");
  useEffect(() => {
    if (!isTauri) return;
    let disposed = false; let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try { const next = await invoke<View>("lyrics_view"); if (!disposed) setView(next); }
      catch { if (!disposed) setView(null); }
      finally { if (!disposed) timer = setTimeout(poll, 150); }
    }
    void poll(); return () => { disposed = true; clearTimeout(timer); };
  }, []);
  const style = { "--lyric-primary": a.primary, "--lyric-secondary": a.secondary, "--lyric-glow": a.glow, "--lyric-size": `${a.size}px`, "--lyric-blur": `${a.strength / 2}px` } as CSSProperties;
  return <main className={`floating-lyrics lyrics-${a.style}`} style={style}>
    <nav className="lyrics-toolbar" aria-label="Overlay controls">
      <button disabled={!isTauri} onPointerDown={e => { if (e.button === 0 && isTauri) void getCurrentWindow().startDragging().catch(e => setError(String(e))); }}>⠿ Move</button>
      <span>{view?.title || "Auralis lyrics"}{view?.artist ? ` · ${view.artist}` : ""}</span>
      <button aria-label="Close lyrics overlay" disabled={!isTauri} onClick={() => { void getCurrentWindow().close().catch(e => setError(String(e))); }}>×</button>
    </nav>
    <div className="desktop-lyric-stage"><div className="lyric-stack" key={`${view?.title}|${view?.lineId}|${view?.current}`}>
      <p className="desktop-lyric-neighbor lyric-before">{view?.previous || " "}</p>
      <p className="desktop-lyric-current">{view?.current || "Your music, in the moment"}</p>
      <p className="desktop-lyric-neighbor lyric-after">{view?.next || " "}</p>
    </div></div>
    <p className="lyrics-overlay-help">{error || (!view ? "Choose a recording in Auralis to begin" : view.artist.endsWith(" · Manual lyrics") ? "Untimed lyrics · Use Previous / Next line in Auralis" : "Line-synced · Appearance controls in Auralis")}</p>
  </main>;
}
