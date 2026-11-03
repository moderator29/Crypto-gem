"use client";

import { createContext, useContext } from "react";
import type { LocaleCode } from "@/lib/i18n/config";
import { translate, type Messages, type MessageKey } from "@/lib/i18n/messages";

const Ctx = createContext<{ locale: LocaleCode; messages: Messages } | null>(null);

export function I18nProvider({ locale, messages, children }: { locale: LocaleCode; messages: Messages; children: React.ReactNode }) {
  return <Ctx.Provider value={{ locale, messages }}>{children}</Ctx.Provider>;
}

export function useT() {
  const c = useContext(Ctx);
  return {
    locale: c?.locale ?? "en",
    t: (k: MessageKey) => (c ? translate(c.messages, k) : k),
  };
}
