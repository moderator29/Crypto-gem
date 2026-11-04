"use client";

import { useSyncExternalStore } from "react";

export type SoundName = "tap" | "success" | "error" | "notify" | "whoosh" | "coin";

const KEY = "cg:sound";
interface Prefs { enabled: boolean; volume: number }
const DEFAULTS: Prefs = { enabled: false, volume: 0.5 };
const subs = new Set<() => void>();
let prefs: Prefs | null = null;
let ctx: AudioContext | null = null;

function load(): Prefs {
  if (prefs) return prefs;
  try {
    const raw = window.localStorage.getItem(KEY);
    prefs = raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Prefs>) } : DEFAULTS;
  } catch {
    prefs = DEFAULTS;
  }
  return prefs;
}

export function setSoundPrefs(patch: Partial<Prefs>): void {
  prefs = { ...load(), ...patch };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* private mode: applies for this visit only */
  }
  subs.forEach((f) => f());
}

/** Sound preferences, remembered in this browser. Sound is off until the person turns it on. */
export function useSoundPrefs(): Prefs {
  return useSyncExternalStore((f) => (subs.add(f), () => void subs.delete(f)), load, () => DEFAULTS);
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** One short synthesised tone: no audio files, so nothing to download and nothing to license. */
function tone(c: AudioContext, freq: number, start: number, dur: number, vol: number, type: OscillatorType = "sine", glideTo?: number) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime + start);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, c.currentTime + start + dur);
  g.gain.setValueAtTime(0.0001, c.currentTime + start);
  g.gain.exponentialRampToValueAtTime(vol, c.currentTime + start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime + start);
  o.stop(c.currentTime + start + dur + 0.02);
}

/** Plays a named UI sound when the person has turned sound on. Safe to call anywhere on the client. */
export function playSound(name: SoundName): void {
  const p = load();
  if (!p.enabled || p.volume <= 0) return;
  const c = audio();
  if (!c) return;
  const v = 0.18 * p.volume;
  switch (name) {
    case "tap": tone(c, 520, 0, 0.05, v * 0.7, "triangle"); break;
    case "success": tone(c, 523, 0, 0.12, v); tone(c, 659, 0.09, 0.12, v); tone(c, 784, 0.18, 0.22, v); break;
    case "error": tone(c, 220, 0, 0.16, v, "sawtooth", 150); tone(c, 165, 0.12, 0.2, v, "sawtooth", 110); break;
    case "notify": tone(c, 880, 0, 0.1, v); tone(c, 1175, 0.1, 0.18, v); break;
    case "whoosh": tone(c, 200, 0, 0.22, v * 0.6, "sawtooth", 900); break;
    case "coin": tone(c, 988, 0, 0.07, v, "square"); tone(c, 1319, 0.07, 0.3, v, "square"); break;
  }
  if (name === "success" || name === "coin") vibrate([18, 40, 18]);
  else if (name === "error") vibrate([40, 30, 40]);
  else if (name === "tap") vibrate(8);
}

/** Short vibration on phones that support it. Follows the same on switch as sound. */
export function vibrate(pattern: number | number[]): void {
  if (!load().enabled) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* not supported */
  }
}
