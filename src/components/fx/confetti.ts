"use client";

import { playSound } from "./sound";

const COLORS = ["#ff5a3c", "#ff9a5c", "#ffc46b", "#2fe0a1", "#ffffff", "#ff4d6d"];

/** A short burst of confetti over the page, plus a success chime if sound is on. Removes itself when done. */
export function fireConfetti(opts: { x?: number; y?: number; count?: number; sound?: boolean } = {}): void {
  if (typeof document === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    if (opts.sound !== false) playSound("success");
    return;
  }
  if (opts.sound !== false) playSound("success");
  const canvas = document.createElement("canvas");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  Object.assign(canvas.style, { position: "fixed", inset: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: "300" });
  document.body.appendChild(canvas);
  const g = canvas.getContext("2d");
  if (!g) return canvas.remove();
  g.scale(dpr, dpr);
  const ox = opts.x ?? window.innerWidth / 2;
  const oy = opts.y ?? window.innerHeight * 0.35;
  const parts = Array.from({ length: opts.count ?? 90 }, () => {
    const a = Math.random() * Math.PI * 2;
    const s = 4 + Math.random() * 9;
    return { x: ox, y: oy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 5, w: 5 + Math.random() * 6, h: 3 + Math.random() * 5, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: COLORS[Math.floor(Math.random() * COLORS.length)] as string, life: 0 };
  });
  const t0 = performance.now();
  const frame = (t: number) => {
    const age = t - t0;
    g.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (const p of parts) {
      p.vy += 0.32;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.r += p.vr;
      g.save();
      g.globalAlpha = Math.max(0, 1 - age / 1900);
      g.translate(p.x, p.y);
      g.rotate(p.r);
      g.fillStyle = p.c;
      g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      g.restore();
    }
    if (age < 1900) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}
