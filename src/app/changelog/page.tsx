import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { RELEASES, type ChangeTag } from "@/lib/content/changelog";

export const metadata: Metadata = { title: "Changelog", description: "What has changed on Crypto Gems, newest first." };

const TONE: Record<ChangeTag, string> = { New: "badge-brand", Improved: "badge-up", Security: "badge-warn", Data: "" };
const fmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export default function ChangelogPage() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader eyebrow="Changelog" title="What is new" description="Every release, newest first." />
      <ol className="relative space-y-6 border-l border-line pl-6 md:pl-8">
        {RELEASES.map((r, i) => (
          <li key={r.version} className="reveal relative">
            <span className={`absolute -left-[31px] top-6 h-3 w-3 rounded-full border-2 border-[var(--canvas)] md:-left-[39px] ${i === 0 ? "bg-[var(--brand)] shadow-[0_0_12px_var(--neon-glow)]" : "bg-[var(--line-2)]"}`} aria-hidden="true" />
            <article className={`card p-5 md:p-6 ${i === 0 ? "card-lit" : ""}`}>
              <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="badge badge-brand num">v{r.version}</span>
                <span className="text-xs text-muted">{r.date ? fmt.format(new Date(r.date)) : "Earlier release"}</span>
              </header>
              <h2 className="h2 mt-3">{r.title}</h2>
              <p className="mt-1.5 text-sm text-soft">{r.summary}</p>
              <ul className="mt-4 space-y-2.5">
                {r.items.map((it) => (
                  <li key={it.text} className="flex items-start gap-3 text-sm leading-relaxed">
                    <span className={`badge mt-0.5 w-[74px] shrink-0 justify-center ${TONE[it.tag]}`}>{it.tag}</span>
                    <span className="min-w-0 text-soft">{it.text}</span>
                  </li>
                ))}
              </ul>
            </article>
          </li>
        ))}
      </ol>
    </div>
  );
}
