"use client";

import { Share2 } from "lucide-react";
import { useToast } from "./Toast";

/** Uses the device share sheet when there is one, otherwise copies the page link. */
export function ShareButton({ title, label = "Share" }: { title: string; label?: string }) {
  const toast = useToast();
  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      /* the person closed the share sheet; nothing to report */
    }
  }
  return (
    <button type="button" className="btn btn-sm" onClick={() => void share()}>
      <Share2 size={15} aria-hidden="true" /> {label}
    </button>
  );
}
