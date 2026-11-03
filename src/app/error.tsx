"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg py-16 text-center" role="alert">
      <span className="icon-tile mx-auto grid h-14 w-14 place-items-center rounded-lg"><TriangleAlert size={26} /></span>
      <h1 className="mt-5 font-display text-3xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-soft">The page hit an unexpected problem. Your data is safe. Try again.</p>
      <button type="button" className="btn btn-primary mt-6" onClick={reset}><RefreshCw size={16} /> Try again</button>
    </div>
  );
}
