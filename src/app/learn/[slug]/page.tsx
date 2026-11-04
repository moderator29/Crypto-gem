import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleBody } from "@/components/learn/ArticleBody";
import { TocNav } from "@/components/learn/TocNav";
import { ARTICLES, articleBySlug, headings, readingMinutes } from "@/lib/content/learn";

export const dynamicParams = false;

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const a = articleBySlug((await params).slug);
  return a ? { title: a.title, description: a.summary, openGraph: { title: a.title, description: a.summary, type: "article", modifiedTime: a.updated } } : {};
}

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const a = articleBySlug((await params).slug);
  if (!a) notFound();
  const toc = headings(a);
  const related = a.related.map((s) => articleBySlug(s)).filter((x): x is NonNullable<typeof x> => x !== undefined);
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const ld = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    description: a.summary,
    dateModified: a.updated,
    datePublished: a.updated,
    mainEntityOfPage: `${site}/learn/${a.slug}`,
    author: { "@type": "Organization", name: process.env.NEXT_PUBLIC_COMPANY_NAME?.trim() || "Crypto Gems" },
    publisher: { "@type": "Organization", name: process.env.NEXT_PUBLIC_COMPANY_NAME?.trim() || "Crypto Gems" },
  };
  return (
    <div className="mx-auto w-full max-w-5xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <Link href="/learn" className="btn btn-ghost btn-sm mb-4 -ml-2"><ArrowLeft size={14} aria-hidden="true" /> All guides</Link>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_240px]">
        <article className="min-w-0 max-w-3xl">
          <header className="mb-6">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="badge badge-brand">{a.category}</span>
              <span className="inline-flex items-center gap-1 text-xs text-muted"><Clock size={12} aria-hidden="true" /> {readingMinutes(a)} min read</span>
              <span className="text-xs text-muted">Updated {dateFmt.format(new Date(a.updated))}</span>
            </div>
            <h1 className="h1">{a.title}</h1>
            <p className="mt-3 text-base text-soft md:text-lg">{a.summary}</p>
          </header>
          <details className="card-flat mb-6 p-4 lg:hidden">
            <summary className="cursor-pointer text-sm font-semibold">In this article</summary>
            <ol className="mt-3 space-y-1 text-sm">
              {toc.map((t) => <li key={t.id}><a className="block py-1.5 text-soft hover:text-text" href={`#${t.id}`}>{t.text}</a></li>)}
            </ol>
          </details>
          <ArticleBody blocks={a.blocks} />
          <p className="mt-10 rounded-[var(--r-md)] border border-line bg-[var(--surface-2)] px-4 py-3 text-xs leading-relaxed text-muted">Educational content, not financial advice. Markets are risky and you can lose everything you put in.</p>
        </article>
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-3">
            <p className="eyebrow !text-muted">In this article</p>
            <TocNav items={toc} />
          </div>
        </aside>
      </div>
      {related.length > 0 && (
        <section className="mt-12" aria-labelledby="related-h">
          <h2 id="related-h" className="h2 mb-4">Keep reading</h2>
          <ul className="stagger grid gap-3 sm:grid-cols-3">
            {related.map((r) => (
              <li key={r.slug}>
                <Link href={`/learn/${r.slug}`} className="card hover-lift flex h-full flex-col gap-2 p-4">
                  <span className="text-xs text-muted">{r.category}</span>
                  <span className="h3">{r.title}</span>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-semibold text-brand">Read <ArrowRight size={14} aria-hidden="true" /></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
