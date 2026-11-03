import { describe, expect, it } from "vitest";
import { dirOf, LOCALES, negotiate } from "@/lib/i18n/config";
import en from "@/lib/i18n/en.json";
import { messagesFor, translate } from "@/lib/i18n/messages";

describe("i18n", () => {
  it("ships all 14 locales, each with every English key and no empty values", () => {
    expect(LOCALES).toHaveLength(14);
    const keys = Object.keys(en);
    for (const l of LOCALES) {
      const m = messagesFor(l.code);
      for (const k of keys) {
        expect(m[k as keyof typeof m], `${l.code}.${k}`).toBeTruthy();
      }
    }
  });
  it("contains no em-dash in any translation", async () => {
    for (const l of LOCALES) {
      const m = messagesFor(l.code);
      expect(Object.values(m).some((v) => v.includes("—")), l.code).toBe(false);
    }
  });
  it("falls back to English for a missing key", () => {
    const partial = { ...messagesFor("en") };
    delete (partial as Partial<typeof partial>)["nav.boost"];
    expect(translate(partial, "nav.boost")).toBe("Boost");
  });
  it("negotiates language headers and marks Arabic as right to left", () => {
    expect(negotiate("fr-CH,fr;q=0.9,en;q=0.8")).toBe("fr");
    expect(negotiate("zh-TW,zh;q=0.9")).toBe("zh-TW");
    expect(negotiate("zh-CN")).toBe("zh-CN");
    expect(negotiate("xx-YY")).toBe("en");
    expect(negotiate(null)).toBe("en");
    expect(dirOf("ar")).toBe("rtl");
    expect(dirOf("en")).toBe("ltr");
  });
});
