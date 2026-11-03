/** Trim and bound a search query before it reaches a provider. */
export function cleanQuery(q: string | undefined): string {
  return (q ?? "").replace(/\s+/g, " ").trim().slice(0, 100);
}
