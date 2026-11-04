export type Block =
  | { t: "p"; text: string }
  | { t: "h2"; text: string }
  | { t: "ul"; items: string[] }
  | { t: "ol"; items: string[] }
  | { t: "callout"; tone: "tip" | "warn"; title: string; text: string }
  | { t: "cta"; href: string; label: string };

export type LearnCategory = "Safety" | "Markets" | "Trading" | "On this site";

export interface Article {
  slug: string;
  title: string;
  summary: string;
  category: LearnCategory;
  /** ISO date of the last review. */
  updated: string;
  blocks: Block[];
  related: string[];
}

export const CATEGORIES: LearnCategory[] = ["Safety", "Markets", "Trading", "On this site"];

/** Turn a heading into a stable anchor id. */
export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** Words in the article body, used for reading time. */
export function wordCount(a: Article): number {
  const parts: string[] = [a.summary];
  for (const b of a.blocks) {
    if (b.t === "p" || b.t === "h2") parts.push(b.text);
    else if (b.t === "ul" || b.t === "ol") parts.push(...b.items);
    else if (b.t === "callout") parts.push(b.title, b.text);
  }
  return parts.join(" ").split(/\s+/).filter(Boolean).length;
}

/** Whole minutes to read at 220 words a minute, never less than one. */
export function readingMinutes(a: Article): number {
  return Math.max(1, Math.round(wordCount(a) / 220));
}

/** Heading list for the table of contents. */
export function headings(a: Article): Array<{ id: string; text: string }> {
  return a.blocks.filter((b): b is Extract<Block, { t: "h2" }> => b.t === "h2").map((b) => ({ id: slugify(b.text), text: b.text }));
}
