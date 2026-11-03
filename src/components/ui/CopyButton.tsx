"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { useToast } from "./Toast";

export function CopyButton({ value, label = "Copy", what = "Copied to clipboard" }: { value: string; label?: string; what?: string }) {
  const [done, setDone] = useState(false);
  const toast = useToast();
  return (
    <button
      type="button"
      className="btn btn-sm"
      aria-label={label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          toast.success(what);
          setTimeout(() => setDone(false), 1800);
        } catch {
          setDone(false);
          toast.error("Could not copy", "Select the text and copy it manually.");
        }
      }}
    >
      {done ? <Check size={14} /> : <Copy size={14} />} {done ? "Copied" : label}
    </button>
  );
}
