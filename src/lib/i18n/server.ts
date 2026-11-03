import "server-only";
import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, negotiate, type LocaleCode } from "./config";
import { messagesFor, translate, type MessageKey } from "./messages";

/** Cookie choice wins, then the browser's Accept-Language, then English. */
export async function getLocale(): Promise<LocaleCode> {
  const c = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(c)) return c;
  return negotiate((await headers()).get("accept-language")) ?? DEFAULT_LOCALE;
}

export async function getT() {
  const locale = await getLocale();
  const m = messagesFor(locale);
  return { locale, t: (k: MessageKey) => translate(m, k) };
}
