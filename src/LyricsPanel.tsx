import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "./tauri";
import { activeLine, parseLrc, type LyricLine } from "./lyrics";
import "./lyrics.css";
import LyricAppearanceControls from "./LyricAppearanceControls";

type Song = { title: string; artist: string; album: string; position: number; duration: number; playing: boolean; rate: number; source: string };
type Result = { id: number; trackName: string; artistName: string; albumName: string; duration: number; instrumental: boolean; plainLyrics: string | null; syncedLyrics: string | null };
type MediaSource = { source: string; title: string };
const songKey = (song: Song | null) => song ? `${song.source}|${song.title}|${song.artist}|${Math.round(song.duration)}` : "";
export default function LyricsPanel({ fontSize }: { fontSize: number }) {
  const [player, setPlayer] = useState<"spotify" | "browser">(() => { try { return localStorage.getItem("auralis-lyrics-player") === "browser" ? "browser" : "spotify"; } catch { return "spotify"; } });
  const [source, setSource] = useState("");
  const [sources, setSources] = useState<MediaSource[]>([]);
  const [song, setSong] = useState<Song | null>(null);
  const [time, setTime] = useState(0);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [lines, setLines] = useState<LyricLine[]>([]);
  const [plain, setPlain] = useState("");
  const [selected, setSelected] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [offset, setOffset] = useState(0);
  const clock = useRef<{ song: Song; at: number } | null>(null);
  const currentKey = useRef("");
  const request = useRef<AbortController | null>(null);
  useEffect(() => { try { localStorage.setItem("auralis-lyrics-player", player); } catch { /* Source selection still works for this session. */ } }, [player]);
  useEffect(() => {
    currentKey.current = ""; clock.current = null; request.current?.abort();
    setSong(null); setTime(0); setLines([]); setPlain(""); setResults([]); setSelected(""); setNotice(""); setQuery(""); setOffset(0); setSources([]); setBusy(false);
    if (!isTauri) return;
    let disposed = false; let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const snapshot = await invoke<{ song: Song | null; sources: MediaSource[] }>("media_status", { player, source: source || null });
        if (disposed) return;
        const next = snapshot.song;
        setSources(snapshot.sources);
        const nextKey = songKey(next);
        if (nextKey !== currentKey.current) {
          currentKey.current = nextKey; request.current?.abort();
          setLines([]); setPlain(""); setResults([]); setSelected(""); setNotice(""); setOffset(0);
          setQuery(next ? `${next.title} ${next.artist}` : "");
        }
        clock.current = next ? { song: next, at: performance.now() } : null;
        setSong(next); setError("");
      } catch (e) { if (!disposed) { clock.current = null; setSong(null); setError(String(e)); } }
      finally { if (!disposed) timer = setTimeout(poll, 750); }
    }
    void poll();
    const tick = setInterval(() => {
      const c = clock.current;
      setTime(c ? Math.min(c.song.duration, c.song.position + (c.song.playing ? (performance.now() - c.at) / 1000 * c.song.rate : 0)) : 0);
    }, 80);
    return () => { disposed = true; clearTimeout(timer); clearInterval(tick); request.current?.abort(); };
  }, [player, source]);

  async function search() {
    if (!query.trim()) return;
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    const lookupKey = currentKey.current;
    const timeout = setTimeout(() => controller.abort(), 15000);
    setBusy(true); setNotice(""); setResults([]);
    try {
      const response = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal });
      if (!response.ok) throw new Error(`Lyrics service returned ${response.status}. Try again later.`);
      const data: unknown = await response.json();
      if (!Array.isArray(data)) throw new Error("Unexpected lyrics response.");
      const matches = data.filter((r): r is Result => r && typeof r.id === "number" && typeof r.trackName === "string" && typeof r.artistName === "string" && typeof r.duration === "number").slice(0, 12);
      if (lookupKey !== currentKey.current || request.current !== controller) return;
      setResults(matches); setNotice(matches.length ? "Choose the recording that matches your song and duration." : "No matches found. Edit the title/artist or import an LRC file.");
    } catch (e) { if (lookupKey === currentKey.current && request.current === controller) setNotice(controller.signal.aborted ? "Lookup cancelled or timed out. Try again." : String(e)); }
    finally { clearTimeout(timeout); if (request.current === controller) setBusy(false); }
  }
  function choose(result: Result) {
    const parsed = typeof result.syncedLyrics === "string" ? parseLrc(result.syncedLyrics) : [];
    setLines(parsed); setPlain(typeof result.plainLyrics === "string" ? result.plainLyrics : "");
    setSelected(`${result.trackName} · ${result.artistName}`); setResults([]);
    setNotice(result.instrumental ? "This recording is marked instrumental." : parsed.length ? "Lyrics follow the selected player. Use timing adjustment if needed." : "Only untimed lyrics are available for this recording.");
  }
  const index = activeLine(lines, time + offset);
  const previous = lines[index - 1]?.text ?? "";
  const current = index < 0 ? "♪" : lines[index]?.text || "♪";
  const next = lines[index + 1]?.text ?? "";
  const timedWords = lines[index]?.words;
  const activeWord = timedWords ? activeLine(timedWords, time + offset) : -1;
  useEffect(() => {
    if (!isTauri) return;
    void invoke("update_lyrics_view", { view: { title: song?.title ?? "No active track", artist: song?.artist ?? "", previous: lines.length && song ? previous : "", current: lines.length && song ? current : "Find lyrics in Auralis", next: lines.length && song ? next : "", fontSize, lineId: index, words: song ? timedWords?.map(w => w.text) ?? [] : [], activeWord: song ? activeWord : -1, playing: song?.playing ?? false } }).catch(() => {});
  }, [song?.title, song?.artist, song?.playing, !!song, previous, current, next, lines.length, fontSize, index, timedWords, activeWord]);
  return <section className="settings lyrics-panel" aria-label="Synchronized lyrics">
    <div className="section-title"><div><p className="eyebrow">{player === "browser" ? "YOUTUBE / BROWSER LYRICS" : "SPOTIFY LYRICS"}</p><h2>{song?.title || "Your music, line by line"}</h2><p>{song?.artist || (player === "browser" ? "Play a YouTube music video in your browser to begin." : "Play a song in Spotify desktop to begin.")}</p></div><button disabled={!isTauri} onClick={() => { void invoke("open_lyrics_window").catch(e => setNotice(String(e))); }}>Desktop lyrics</button></div>
    <label>Lyrics player<select value={player} onChange={e => { setPlayer(e.target.value as "spotify" | "browser"); setSource(""); }}><option value="spotify">Spotify desktop</option><option value="browser">YouTube / browser</option></select></label>
    {player === "browser" && <>
      <label>Browser session<select value={source} onChange={e => setSource(e.target.value)}><option value="">Automatic — prefer playing</option>{source && !sources.some(s => s.source === source) && <option value={source}>Selected browser unavailable</option>}{sources.filter((s, i, all) => all.findIndex(x => x.source === s.source) === i).map(s => <option key={s.source} value={s.source}>{s.source} — {s.title || "Untitled media"}</option>)}</select></label>
      <p>Uses the media session your browser shares with Windows; it cannot identify the website or choose a tab directly. Play YouTube and pause other browser media. If multiple browsers are active, select the right session above.</p>
      <p>YouTube may report the channel name instead of the artist. Edit the search text before Find lyrics. Ads, intros, live streams, or alternate versions can disrupt timing; use the adjustment for small offsets.</p>
    </>}
    <LyricAppearanceControls />
    <div className="scene-launch"><div><h3>Listening Scene</h3><p>A full-screen music space with Classic lines or reel-inspired Constellation lyrics. Both share the background and edge lighting.</p></div><button disabled={!isTauri} onClick={() => { void invoke("open_listening_scene").catch(e => setNotice(String(e))); }}>Enter Listening Scene</button></div>
    <p>Constellation uses actual word timestamps when an enhanced LRC file supplies them. Standard lyrics remain line-timed; no word timings are guessed.</p>
    <p>{song ? `${song.playing ? "Playing" : "Paused"} · ${Math.floor(time)} / ${Math.floor(song.duration)} seconds` : `Waiting for ${player === "browser" ? "your browser’s" : "Spotify’s"} Windows media session.`}</p>
    {song && song.duration <= 0 && <p role="status">This player has not provided a usable playback timeline. Try a regular song or video; timed highlighting cannot sync yet.</p>}
    {lines.length > 0 && song && <div className="lyric-stage" style={{ fontSize }}><p className="lyric-neighbor">{previous || " "}</p><p className="lyric-current">{current}</p><p className="lyric-neighbor">{next || " "}</p></div>}
    {!lines.length && plain && <div className="plain-lyrics">{plain}</div>}
    {selected && <p>Selected: {selected} · Lyrics from LRCLIB or your imported file.</p>}
    <label>Find a recording<input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Song title and artist" maxLength={200} /></label>
    <button disabled={!song || busy || !query.trim()} onClick={() => void search()}>{busy ? "Finding lyrics…" : "Find lyrics"}</button>
    <p>Find lyrics sends this search text to LRCLIB. Audio is never sent. Choose the correct version; live recordings and remixes can have different timings.</p>
    <div className="lyric-results">{results.map(r => <button key={r.id} onClick={() => choose(r)}>{r.trackName} — {r.artistName} · {Math.round(r.duration)}s · {r.syncedLyrics ? "Timed" : r.instrumental ? "Instrumental" : "Untimed"}</button>)}</div>
    <label>Timing adjustment: {offset > 0 ? "+" : ""}{offset.toFixed(1)}s<input type="range" min="-10" max="10" step="0.1" value={offset} onChange={e => setOffset(Number(e.target.value))} /></label>
    <p>Positive values show lyrics earlier. Track changes clear the previous lyrics and adjustment.</p>
    <label>Or import timed lyrics (.lrc)<input type="file" accept=".lrc,text/plain" disabled={!song} onChange={async e => {
      const file = e.target.files?.[0]; const importKey = currentKey.current; e.target.value = "";
      if (!file) return;
      if (file.size > 1_000_000) { setNotice("Choose an LRC file smaller than 1 MB."); return; }
      try { const parsed = parseLrc(await file.text()); if (importKey !== currentKey.current) return; setLines(parsed); setPlain(""); setResults([]); setSelected(file.name); setNotice(parsed.length ? "Imported timed lyrics. Nothing was uploaded." : "No valid timestamps found in this file."); }
      catch (e) { setNotice(String(e)); }
    }} /></label>
    <p role="status">{notice}</p>{error && <p role="alert">{error}</p>}
    {!isTauri && <p>Media detection requires the Auralis Windows desktop app.</p>}
  </section>;
}
