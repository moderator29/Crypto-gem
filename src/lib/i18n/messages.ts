import ar from "./ar.json";
import en from "./en.json";
import es from "./es.json";
import fr from "./fr.json";
import hi from "./hi.json";
import id from "./id.json";
import ja from "./ja.json";
import ko from "./ko.json";
import pt from "./pt.json";
import ru from "./ru.json";
import tr from "./tr.json";
import vi from "./vi.json";
import zhCN from "./zh-CN.json";
import zhTW from "./zh-TW.json";
import type { LocaleCode } from "./config";

export type MessageKey = keyof typeof en;
export type Messages = Record<MessageKey, string>;

const DICTS: Record<LocaleCode, Partial<Messages>> = { en, "zh-CN": zhCN, "zh-TW": zhTW, es, pt, fr, ja, ko, ar, hi, ru, tr, id, vi };

/** Locale messages layered over English, so a missing key never shows a raw key. */
export function messagesFor(code: LocaleCode): Messages {
  return { ...en, ...DICTS[code] };
}

export function translate(messages: Messages, key: MessageKey): string {
  return messages[key] ?? en[key];
}
