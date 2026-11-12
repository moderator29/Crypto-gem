"use client";

import { useEffect } from "react";

/** Tints the page aurora from a 0 to 100 Fear and Greed reading while Discover is open. Renders nothing. */
export function MoodTint({ value }: { value: number }) {
  useEffect(() => {
    const el = document.documentElement;
    el.setAttribute("data-mood", value < 40 ? "fear" : value > 60 ? "greed" : "calm");
    return () => el.removeAttribute("data-mood");
  }, [value]);
  return null;
}
