export const LOCALES = [
  { code: "en", label: "English", dir: "ltr" },
  { code: "zh-CN", label: "简体中文", dir: "ltr" },
  { code: "zh-TW", label: "繁體中文", dir: "ltr" },
  { code: "es", label: "Español", dir: "ltr" },
  { code: "pt", label: "Português", dir: "ltr" },
  { code: "fr", label: "Français", dir: "ltr" },
  { code: "ja", label: "日本語", dir: "ltr" },
  { code: "ko", label: "한국어", dir: "ltr" },
  { code: "ar", label: "العربية", dir: "rtl" },
  { code: "hi", label: "हिन्दी", dir: "ltr" },
  { code: "ru", label: "Русский", dir: "ltr" },
  { code: "tr", label: "Türkçe", dir: "ltr" },
  { code: "id", label: "Bahasa Indonesia", dir: "ltr" },
  { code: "vi", label: "Tiếng Việt", dir: "ltr" },
] as const;

export type LocaleCode = (typeof LOCALES)[number]["code"];
export const DEFAULT_LOCALE: LocaleCode = "en";
export const LOCALE_COOKIE = "cg-locale";

export function isLocale(v: string | undefined | null): v is LocaleCode {
  return LOCALES.some((l) => l.code === v);
}

export function dirOf(code: LocaleCode): "ltr" | "rtl" {
  return LOCALES.find((l) => l.code === code)?.dir ?? "ltr";
}

/** Picks the best supported locale from an Accept-Language header. Falls back to English. */
export function negotiate(header: string | null | undefined): LocaleCode {
  if (!header) return DEFAULT_LOCALE;
  const wanted = header.split(",").map((p) => p.split(";")[0]!.trim().toLowerCase());
  for (const w of wanted) {
    if (w === "zh-tw" || w === "zh-hk" || w === "zh-hant") return "zh-TW";
    if (w.startsWith("zh")) return "zh-CN";
    const base = w.split("-")[0]!;
    const hit = LOCALES.find((l) => l.code.toLowerCase() === w || l.code.toLowerCase() === base);
    if (hit) return hit.code;
  }
  return DEFAULT_LOCALE;
}
