import { MessageCircle, Send } from "lucide-react";
import { adminContacts, channelLinks } from "@/lib/contacts";

const EXT = { target: "_blank", rel: "noopener noreferrer" } as const;

/**
 * Reusable "Talk to our team" block. One button per admin that opens a Telegram chat,
 * plus the official channel and Weibo. "inline" is a compact wrapping row, "card" is a full panel.
 */
export function ContactCard({ variant = "card", title = "Talk to our team", note, className = "" }: { variant?: "inline" | "card"; title?: string; note?: string; className?: string }) {
  const admins = adminContacts();
  const channels = channelLinks();

  if (variant === "inline") {
    return (
      <div className={`contact-inline flex min-w-0 flex-wrap items-center gap-2 ${className}`} aria-label={title}>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-muted"><MessageCircle size={14} aria-hidden="true" /> {title}</span>
        {admins.map((a) => (
          <a key={a.handle} href={a.url} {...EXT} className="btn btn-sm contact-btn min-w-0 max-w-full"><Send size={14} aria-hidden="true" /> <span className="truncate">{a.label}</span></a>
        ))}
      </div>
    );
  }

  return (
    <section className={`card contact-card relative min-w-0 space-y-4 overflow-hidden p-4 md:p-5 ${className}`} aria-label={title}>
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--surface-3)] text-brand"><MessageCircle size={21} aria-hidden="true" /></span>
        <div className="min-w-0">
          <h2 className="h3">{title}</h2>
          <p className="mt-0.5 text-sm text-soft">{note ?? "Questions about listings, banners or a custom campaign? Message an admin directly on Telegram."}</p>
        </div>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2">
        {admins.map((a) => (
          <a key={a.handle} href={a.url} {...EXT} className="card-flat hover-lift contact-btn flex min-h-12 min-w-0 items-center gap-3 px-4 text-sm font-semibold">
            <Send size={16} className="shrink-0 text-brand" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{a.label}</span>
            <span className="shrink-0 text-xs text-muted">Telegram</span>
          </a>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-3 text-sm">
        {channels.map((c) => (
          <a key={c.id} href={c.url} {...EXT} className="font-semibold text-brand hover:underline">{c.label}</a>
        ))}
      </div>
    </section>
  );
}
