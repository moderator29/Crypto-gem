"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { buildQuery, isDirty, parseQuery, sanitizeValues, type ParamSpec, type Values } from "@/lib/engage/params";
import { markToolUsed } from "@/lib/engage/progress";
import { TOOL_SPECS } from "@/lib/tools/specs";

export interface CalcInputs<D extends Values = Values> {
  slug: string;
  spec: ParamSpec;
  defaults: D;
  values: D;
  set: (key: keyof D & string) => (v: string) => void;
  setValues: (v: Values) => void;
  reset: () => void;
  dirty: boolean;
  /** Link to this page with the current inputs in the query string. */
  shareUrl: () => string;
}

const NO_SPEC: ParamSpec = {};
const noop = () => () => undefined;
const readSearch = () => window.location.search;

/**
 * Input state for a calculator. Starts from the validated query string if there is one, tracks use for badges,
 * and exposes what the share and scenario buttons need.
 */
export function useCalcInputs<D extends Values>(slug: string, defaults: D): CalcInputs<D> {
  const spec = TOOL_SPECS[slug] ?? NO_SPEC;
  const search = useSyncExternalStore(noop, readSearch, () => "");
  const fromUrl = useMemo(() => sanitizeValues(spec, parseQuery(search), defaults) as D, [spec, search, defaults]);
  const [edits, setEdits] = useState<D | null>(null);
  const values = edits ?? fromUrl;
  const dirty = isDirty(values, defaults);

  useEffect(() => {
    if (dirty) markToolUsed(slug);
  }, [dirty, slug]);

  const set = useCallback((key: keyof D & string) => (v: string) => setEdits((prev) => ({ ...(prev ?? fromUrl), [key]: v })), [fromUrl]);
  const setValues = useCallback((v: Values) => setEdits(sanitizeValues(spec, v, defaults) as D), [spec, defaults]);
  const reset = useCallback(() => setEdits(defaults), [defaults]);
  const shareUrl = useCallback(() => {
    const q = buildQuery(spec, values, defaults);
    return `${window.location.origin}${window.location.pathname}${q ? `?${q}` : ""}`;
  }, [spec, values, defaults]);

  return { slug, spec, defaults, values, set, setValues, reset, dirty, shareUrl };
}
