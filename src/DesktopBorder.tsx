import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { approach, envelope } from "./glowMotion";
import "./border.css";

type Frame = { settings: { color: string; accent: string; mode: string; brightness: number; sensitivity: number; fade: number; thickness: number; glow: number }; running: boolean; level: number };
export default function DesktopBorder() {
  const [frame, setFrame] = useState<Frame | null>(null);
  const latest = useRef<Frame | null>(null);
  const receivedAt = useRef(0);
  const layer = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let disposed = false; let timer: ReturnType<typeof setTimeout>;
    let animation = 0; let previousTime = 0; let energy = 0; let opacity = 0;
    let settingsKey = "";
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    async function poll() {
      try {
        const next = await invoke<Frame>("border_frame");
        if (disposed) return;
        latest.current = next; receivedAt.current = performance.now();
        const key = JSON.stringify(next.settings);
        if (key !== settingsKey) { settingsKey = key; setFrame(next); }
      }
      catch { if (!disposed) latest.current = null; }
      finally { if (!disposed) timer = setTimeout(poll, 40); }
    }
    function draw(now: number) {
      const elapsed = previousTime ? Math.min(100, now - previousTime) : 16;
      previousTime = now;
      const snapshot = latest.current;
      const fresh = snapshot && now - receivedAt.current < 1000;
      const s = snapshot?.settings;
      let target = fresh && snapshot.running ? Math.min(1, Math.max(0, snapshot.level) * snapshot.settings.sensitivity) : 0;
      if (reducedMotion.matches) target = 0;
      energy = envelope(energy, target, elapsed, s?.fade ?? 700);
      const desired = fresh && s ? (0.12 + 0.88 * energy) * s.brightness / 100 : 0;
      opacity = approach(opacity, desired, elapsed, 90);
      if (layer.current) layer.current.style.opacity = opacity.toFixed(4);
      animation = requestAnimationFrame(draw);
    }
    void poll();
    animation = requestAnimationFrame(draw);
    return () => { disposed = true; clearTimeout(timer); cancelAnimationFrame(animation); };
  }, []);
  if (!frame) return null;
  const { settings: s } = frame;
  const second = s.mode === "solid" ? s.color : s.accent;
  return <div ref={layer} aria-hidden="true" className="desktop-glow" style={{ opacity: 0 }}>
    <div className="border-edge border-top" style={{ height: s.thickness, backgroundColor: s.color, boxShadow: `0 0 ${s.glow}px ${s.glow / 3}px ${s.color}` }} />
    <div className="border-edge border-bottom" style={{ height: s.thickness, backgroundColor: second, boxShadow: `0 0 ${s.glow}px ${s.glow / 3}px ${second}` }} />
    <div className="border-edge border-left" style={{ width: s.thickness, background: `linear-gradient(${s.color}, ${second})`, filter: `drop-shadow(0 0 ${s.glow / 2}px ${s.color})` }} />
    <div className="border-edge border-right" style={{ width: s.thickness, background: `linear-gradient(${s.color}, ${second})`, filter: `drop-shadow(0 0 ${s.glow / 2}px ${second})` }} />
  </div>;
}
