"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pager({ offset, limit, total, onChange }: { offset: number; limit: number; total: number; onChange: (offset: number) => void }) {
  if (total <= limit) return null;
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + limit, total);
  return (
    <div className="mt-4 flex items-center justify-between gap-3 text-sm text-soft">
      <span>{from}-{to} of {total}</span>
      <div className="flex gap-2">
        <button type="button" className="btn btn-sm" aria-label="Previous page" disabled={offset === 0} onClick={() => onChange(Math.max(0, offset - limit))}>
          <ChevronLeft size={16} />
        </button>
        <button type="button" className="btn btn-sm" aria-label="Next page" disabled={offset + limit >= total} onClick={() => onChange(offset + limit)}>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
