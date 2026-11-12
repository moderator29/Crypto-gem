import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type LocaleCode } from "./config";
import { messagesFor, translate, type MessageKey } from "./messages";

/** The visitor's own choice (cookie) wins. Everyone else starts in Simplified Chinese. */
export async function getLocale(): Promise<LocaleCode> {
  const c = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(c) ? c : DEFAULT_LOCALE;
}

export async function getT() {
  const locale = await getLocale();
  const m = messagesFor(locale);
  return { locale, t: (k: MessageKey) => translate(m, k) };
}
