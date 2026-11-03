import type { ReactNode } from "react";

export const LAST_UPDATED = "3 November 2026";

export function companyName(): string {
  return process.env.NEXT_PUBLIC_COMPANY_NAME?.trim() || "Crypto Gems";
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
  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <div hidden dangerouslySetInnerHTML={{ __html: `<!-- ${owner.replace(/-->/g, "")} -->` }} />
      <header className="card p-6 md:p-8">
        <h1 className="font-display text-3xl font-bold leading-tight md:text-4xl">{title}</h1>
        <p className="mt-1 text-xs text-muted">Last updated {LAST_UPDATED}</p>
        <div className="mt-4 text-soft">{intro}</div>
      </header>

      <nav aria-label="Contents" className="card-flat p-5">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted">Contents</h2>
        <ol className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
          {sections.map((s, i) => (
            <li key={s.id}><a className="block min-h-8 py-1 text-soft hover:text-text" href={`#${s.id}`}>{i + 1}. {s.title}</a></li>
          ))}
        </ol>
      </nav>

      {sections.map((s, i) => (
        <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="card scroll-mt-24 space-y-3 p-6 md:p-8">
          <h2 id={`${s.id}-h`} className="font-display text-xl font-bold md:text-2xl">{i + 1}. {s.title}</h2>
          <div className="space-y-3 break-words text-sm leading-relaxed text-soft md:text-base [&_a]:text-brand [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">{s.body}</div>
        </section>
      ))}
    </div>
  );
}
