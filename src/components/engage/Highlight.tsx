import { splitHighlight } from "@/lib/engage/highlight";

/** Text with the words of a search query marked. Renders plain text when the query is empty. */
export function Highlight({ text, query }: { text: string; query: string }) {
  return (
    <>
      {splitHighlight(text, query).map((run, i) => (run.hit ? <mark key={i} className="hl">{run.text}</mark> : <span key={i}>{run.text}</span>))}
    </>
  );
}
