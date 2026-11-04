"use client";

import { useEffect } from "react";
import { playSound } from "./sound";

/** One delegated listener: buttons, nav rows and chips tick softly when sound is on. Mounted once in the layout. */
export function SoundTaps() {
  useEffect(() => {
    const on = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest("button, a.btn, a.nav-row, .chip, [role=tab], [role=switch]");
      if (el && !(el as HTMLButtonElement).disabled) playSound("tap");
    };
    document.addEventListener("pointerdown", on, { passive: true });
    return () => document.removeEventListener("pointerdown", on);
  }, []);
  return null;
}
