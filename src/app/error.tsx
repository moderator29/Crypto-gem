"use client";

import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { GemMark } from "@/components/ui/Logo";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="relative mx-auto max-w-lg overflow-hidden py-16 text-center" role="alert">
      <div className="fx-aurora" aria-hidden="true"><i /><i /><i /></div>
      <div className="relative z-10">
        <div className="relative mx-auto h-36 w-36" aria-hidden="true">
          <svg viewBox="0 0 120 120" width="144" height="144" fill="none" className="absolute inset-0">
            <circle className="art-orbit-rev" cx="60" cy="60" r="54" stroke="color-mix(in srgb, var(--down) 45%, transparent)" strokeWidth="1.5" strokeDasharray="6 8" strokeLinecap="round" />
            <circle className="art-twinkle" cx="100" cy="30" r="3" fill="var(--down)" />
            <circle className="art-twinkle" cx="20" cy="86" r="2.5" fill="var(--warm)" />
          </svg>
          <span className="fx-float absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-80"><GemMark size={56} /></span>
        </div>
        <h1 className="h1">Something went wrong</h1>
        <p className="mt-2 text-soft">The page hit an unexpected problem. Your data is safe. Try again.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" className="btn btn-primary" onClick={reset}><RefreshCw size={16} aria-hidden="true" /> Try again</button>
          <Link href="/" className="btn">Back to Discover</Link>
        </div>
      </div>
    </div>
  );
}
