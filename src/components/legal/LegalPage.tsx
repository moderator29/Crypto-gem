import type { ReactNode } from "react";
import { TocNav } from "@/components/learn/TocNav";

export const LAST_UPDATED = "3 November 2026";

export function companyName(): string {
  return process.env.NEXT_PUBLIC_COMPANY_NAME?.trim() || "CryptoGemCN";
}

/** Contact email from env, or null so the page falls back to in-product support instead of a made-up address. */
export function contactEmail(): string | null {
  return process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || null;
}

export function ContactLine() {
  const email = contactEmail();
  return email ? <a className="font-semibold text-brand" href={`mailto:${email}`}>{email}</a> : <span>our support team</span>;
}

export interface LegalSection {
  id: string;
  title: string;
  body: ReactNode;
}

/**
 * Shared shell for legal pages: card header, table of contents with anchors, readable prose width.
 * `owner` is a static developer note emitted as an HTML comment so placeholders are easy to find in source.
 */
export function LegalPage({ title, intro, sections, owner }: { title: string; intro: ReactNode; sections: LegalSection[]; owner: string }) {
  const toc = sections.map((x, i) => ({ id: x.id, text: `${i + 1}. ${x.title}` }));
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-[minmax(0,1fr)_240px]">
      <div hidden dangerouslySetInnerHTML={{ __html: `<!-- ${owner.replace(/-->/g, "")} -->` }} />
      <div className="min-w-0 max-w-3xl space-y-5">
        <header className="card card-lit p-6 md:p-8">
          <h1 className="h1">{title}</h1>
          <p className="mt-1 text-xs text-muted">Last updated {LAST_UPDATED}</p>
          <div className="mt-4 text-soft">{intro}</div>
        </header>

        <details className="card-flat p-4 lg:hidden">
          <summary className="cursor-pointer text-sm font-semibold">Contents</summary>
          <ol className="mt-3 space-y-0.5 text-sm">
            {sections.map((s, i) => (
              <li key={s.id}><a className="block min-h-9 py-1.5 text-soft hover:text-text" href={`#${s.id}`}>{i + 1}. {s.title}</a></li>
            ))}
          </ol>
        </details>

        {sections.map((s, i) => (
          <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="card reveal scroll-mt-24 space-y-3 p-6 md:p-8">
            <h2 id={`${s.id}-h`} className="h2">{i + 1}. {s.title}</h2>
            <div className="space-y-3 break-words text-sm leading-relaxed text-soft md:text-base [&_a]:text-brand [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">{s.body}</div>
          </section>
        ))}
      </div>
      <aside className="hidden lg:block">
        <div className="sticky top-24 space-y-3">
          <p className="eyebrow !text-muted">Contents</p>
          <TocNav items={toc} />
        </div>
      </aside>
    </div>
  );
}
