import { SITE } from "@/lib/site";

export interface Contact {
  handle: string;
  label: string;
  url: string;
}

const HANDLE = /^[A-Za-z0-9_]{5,32}$/;

/** Direct Telegram link for a handle. Returns null for anything that is not a valid Telegram username. */
export function telegramUrl(handle: string): string | null {
  const clean = handle.trim().replace(/^@/, "");
  return HANDLE.test(clean) ? `https://t.me/${clean}` : null;
}

/** The admins a visitor can message, always built from the single source in site.ts and always a valid t.me link. */
export function adminContacts(): Contact[] {
  return SITE.admins.flatMap((a) => {
    const url = telegramUrl(a.handle);
    return url ? [{ handle: a.handle, label: `@${a.handle}`, url }] : [];
  });
}

/** Official public channels shown beside the admin buttons. */
export function channelLinks(): Array<{ id: "telegram" | "weibo"; label: string; url: string }> {
  return [
    { id: "telegram", label: "Telegram channel", url: SITE.telegramChannel },
    { id: "weibo", label: "Weibo", url: SITE.weibo },
  ];
}
