import type { CSSProperties } from "react";
import "./constellation.css";

type Props = { current: string; previous: string; next: string; words: string[]; activeWord: number; lineId: number; title: string; playing: boolean; symbols: boolean };
// Fixed surrounding positions leave a clear central area for the focal lyric.
const positions = [[16, 29], [39, 17], [73, 23], [85, 51], [70, 79], [38, 84], [13, 68]];
export default function ConstellationLyrics(p: Props) {
  const timed = p.words.length > 0 && p.activeWord >= 0 && p.activeWord < p.words.length;
  const focus = timed ? p.words[p.activeWord] : p.current;
  const neighbors = timed
    ? p.words.map((text, index) => ({ text, index })).filter(w => w.index !== p.activeWord && Math.abs(w.index - p.activeWord) <= 4).slice(0, 7)
    : [{ text: p.previous, index: -1 }, { text: p.next, index: 1 }].filter(w => w.text);
  return <section className={`lyric-universe ${p.playing ? "is-playing" : ""} ${timed ? "is-word-timed" : "is-line-timed"}`} aria-label="Constellation lyrics">
    <svg className="universe-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <path d="M16 29 L39 17 L73 23 L85 51 L70 79 L38 84 L13 68 Z M16 29 L70 79 M39 17 L85 51 M73 23 L38 84 M13 68 L39 17" />
      {positions.map(([x,y], i) => <circle key={i} cx={x} cy={y} r=".32" />)}
    </svg>
    {p.symbols && positions.map(([x,y], i) => <span key={i} className="universe-star" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * -.8}s` }} aria-hidden="true">✧</span>)}
    <div className="universe-satellites" aria-hidden="true">
      {neighbors.map((word, i) => {
        const slot = timed ? i : (i === 0 ? 0 : 4);
        const [x, y] = positions[slot];
        return <span key={`${p.title}:${p.lineId}:${word.index}`} className={`universe-word ${word.index < p.activeWord ? "has-passed" : ""}`} style={{ "--x": `${x}%`, "--y": `${y}%` } as CSSProperties}>{word.text}</span>;
      })}
    </div>
    <div className="universe-focus" aria-label={p.current}>
      <div key={`${p.title}:${p.lineId}:${timed ? p.activeWord : "line"}`} className={`universe-focus-arrival ${focus.length > 35 ? "long-focus" : ""}`}>
        <p>{focus}</p>
        {p.symbols && <span className="universe-emblem" aria-hidden="true">✦</span>}
      </div>
    </div>
    {timed && <p className="universe-caption">{p.current}</p>}
  </section>;
}
