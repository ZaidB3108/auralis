export type LyricWord = { time: number; text: string };
export type LyricLine = { time: number; text: string; words?: LyricWord[] };
export function parseLrc(source: string): LyricLine[] {
  const offset = Number(source.match(/\[offset:([+-]?\d+)\]/i)?.[1] ?? 0) / 1000;
  const lines: LyricLine[] = [];
  for (const row of source.split(/\r?\n/)) {
    const stamps = [...row.matchAll(/\[(\d+):([0-5]\d)(?:[.:](\d{1,3}))?\]/g)];
    const content = row.replace(/\[[^\]]*\]/g, "").trim();
    const wordStamps = [...content.matchAll(/<(\d+):([0-5]\d)(?:[.:](\d{1,3}))?>/g)];
    const words = wordStamps.map((stamp, i) => ({
      time: Number(stamp[1]) * 60 + Number(stamp[2]) + Number(`0.${stamp[3] ?? 0}`) + offset,
      text: content.slice(stamp.index! + stamp[0].length, wordStamps[i + 1]?.index ?? content.length).trim()
    })).filter(word => word.text.length > 0 && Number.isFinite(word.time));
    const text = content.replace(/<\d+:[0-5]\d(?:[.:]\d{1,3})?>/g, "").trim();
    for (const stamp of stamps) {
      const time = Number(stamp[1]) * 60 + Number(stamp[2]) + Number(`0.${stamp[3] ?? 0}`) + offset;
      const firstTime = stamps.length ? Number(stamps[0][1]) * 60 + Number(stamps[0][2]) + Number(`0.${stamps[0][3] ?? 0}`) + offset : time;
      const shifted = words.map(word => ({ ...word, time: Math.max(0, word.time + time - firstTime) }));
      const validWords = shifted.length > 0 && shifted.every((word, i) => word.time >= time && (i === 0 || word.time >= shifted[i - 1].time));
      if (Number.isFinite(time)) lines.push({ time: Math.max(0, time), text, ...(validWords ? { words: shifted } : {}) });
    }
  }
  return lines.sort((a, b) => a.time - b.time);
}
export function activeLine(lines: LyricLine[], time: number): number {
  let low = 0; let high = lines.length;
  while (low < high) { const middle = (low + high) >>> 1; if (lines[middle].time <= time) low = middle + 1; else high = middle; }
  return low - 1;
}
