"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useT } from "@/components/i18n/I18nProvider";
import { LinkRow, RowGroup, SwitchRow } from "@/components/ui/Rows";
import { setDisplayPrefs, useDisplayPrefs } from "@/lib/displayPrefs";
import { LOCALE_COOKIE, LOCALES } from "@/lib/i18n/config";

/** Activity shortcuts and browser-stored preferences, as grouped rows. Works signed in or out. */
export function PreferencesGroups() {
  const { locale } = useT();
  const router = useRouter();
  const prefs = useDisplayPrefs();
  const [light, setLight] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setLight(document.documentElement.getAttribute("data-theme") === "light"), 0);
    return () => clearTimeout(id);
  }, []);
  const applyTheme = (isLight: boolean) => {
    const t = isLight ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", t);
    try {
      localStorage.setItem("cg-theme", t);
    } catch {
      /* storage unavailable: the choice still applies for this visit */
    }
    setLight(isLight);
  };
  return (
    <div className="space-y-6">
      <RowGroup title="Your activity">
        <LinkRow href="/dashboard/watchlist" icon="star" label="Watchlist" hint="Tokens you follow" />
        <LinkRow href="/alerts" icon="alert" label="Price alerts" hint="Get notified when a price crosses" />
        <LinkRow href="/notifications" icon="inbox" label="Notifications" hint="Alerts, payments and listing decisions" />
        <LinkRow href="/dashboard" icon="dashboard" label="Dashboard" hint="Listings, boosts, campaigns, payments" />
      </RowGroup>
      <RowGroup title="Display">
        <SwitchRow checked={light} onChange={applyTheme} icon="settings" label="Light mode" hint="Dark is the default" />
        <SwitchRow checked={prefs.charts} onChange={(v) => setDisplayPrefs({ charts: v })} icon="markets" label="Show mini charts" hint="7 day trend on each coin row" />
        <SwitchRow checked={prefs.compact} onChange={(v) => setDisplayPrefs({ compact: v })} icon="map" label="Compact rows" hint="Fit more coins on screen" />
        <li className="flex min-h-14 items-center gap-3.5 px-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--surface-3)] text-soft"><span aria-hidden="true" className="text-sm font-bold">A</span></span>
          <label htmlFor="pref-language" className="min-w-0 flex-1 text-[15px] font-semibold">Language</label>
          <select
            id="pref-language"
            className="input !min-h-10 !w-auto"
            value={locale}
            onChange={(e) => {
              document.cookie = `${LOCALE_COOKIE}=${e.target.value}; path=/; max-age=31536000; samesite=lax`;
              router.refresh();
            }}
          >
            {LOCALES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </li>
      </RowGroup>
      <p className="px-1 text-xs text-muted">Display choices are stored in this browser. Navigation and discovery labels are translated, other pages are English for now.</p>
    </div>
  );
}
