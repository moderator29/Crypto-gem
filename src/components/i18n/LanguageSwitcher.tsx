"use client";

import { Globe } from "lucide-react";
import { useRouter } from "next/navigation";
import { LOCALE_COOKIE, LOCALES } from "@/lib/i18n/config";
import { useT } from "./I18nProvider";

/** Persists the choice in a cookie and refreshes so server components re-render in the new language. */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale } = useT();
  const router = useRouter();
  return (
    <label className={`btn relative !gap-1.5 !px-3 ${className}`} aria-label="Language">
      <Globe size={16} aria-hidden="true" />
      <span className="text-xs font-bold uppercase">{locale.split("-")[0]}</span>
      <select
        className="absolute inset-0 cursor-pointer opacity-0"
        value={locale}
        aria-label="Language"
        onChange={(e) => {
          document.cookie = `${LOCALE_COOKIE}=${e.target.value}; path=/; max-age=31536000; samesite=lax`;
          router.refresh();
        }}
      >
        {LOCALES.map((l) => (
          <option key={l.code} value={l.code}>{l.label}</option>
        ))}
      </select>
    </label>
  );
}
