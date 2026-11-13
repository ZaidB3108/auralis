import { useEffect, useState } from "react";
export type Appearance = { primary: string; secondary: string; glow: string; size: number; style: "focus" | "depth"; strength: number };
const key = "auralis-lyric-appearance-v1";
export const defaults: Appearance = { primary: "#ffd6e6", secondary: "#d2b8c8", glow: "#f36ca4", size: 48, style: "depth", strength: 35 };
function read(): Appearance {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    if (!value) return defaults;
    const color = (name: string) => typeof value[name] === "string" && /^#[0-9a-f]{6}$/i.test(value[name]) ? value[name] : defaults[name as "primary"];
    const number = (name: "size" | "strength", min: number, max: number) => typeof value[name] === "number" && Number.isFinite(value[name]) ? Math.min(max, Math.max(min, value[name])) : defaults[name];
    return { primary: color("primary"), secondary: color("secondary"), glow: color("glow"), size: number("size", 28, 84), strength: number("strength", 0, 80), style: value.style === "focus" ? "focus" : "depth" };
  } catch { return defaults; }
}
export function useLyricAppearance() {
  const [appearance, setAppearance] = useState(read);
  const [error, setError] = useState("");
  useEffect(() => {
    const sync = () => setAppearance(read());
    window.addEventListener("storage", sync); window.addEventListener("auralis-lyrics-style", sync);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener("auralis-lyrics-style", sync); };
  }, []);
  function update(patch: Partial<Appearance>) {
    const next = { ...appearance, ...patch }; setAppearance(next);
    try { localStorage.setItem(key, JSON.stringify(next)); window.dispatchEvent(new Event("auralis-lyrics-style")); setError(""); }
    catch { setError("Could not save appearance. Changes may not reach the overlay."); }
  }
  return { appearance, update, error };
}
