const MAX_TOKENS = 6;

/** Distinct lowercase words of a search query. */
export function queryTokens(query: string): string[] {
  const seen = new Set<string>();
  for (const w of query.toLowerCase().split(/\s+/)) if (w) seen.add(w);
  return [...seen].slice(0, MAX_TOKENS);
}

/** True when every word of the query appears somewhere in the text. An empty query matches everything. */
export function matchesAll(text: string, query: string): boolean {
  const hay = text.toLowerCase();
  return queryTokens(query).every((t) => hay.includes(t));
}

/** Split text into runs, flagging the runs that match a query word, so the match can be highlighted. */
export function splitHighlight(text: string, query: string): Array<{ text: string; hit: boolean }> {
  const toks = queryTokens(query).sort((a, b) => b.length - a.length);
  if (toks.length === 0 || text === "") return [{ text, hit: false }];
  const re = new RegExp(`(${toks.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  const runs: Array<{ text: string; hit: boolean }> = [];
  text.split(re).forEach((part, i) => {
    if (part !== "") runs.push({ text: part, hit: i % 2 === 1 });
  });
  return runs;
}
