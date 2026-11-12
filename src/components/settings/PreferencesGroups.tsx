"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useT } from "@/components/i18n/I18nProvider";
import { playSound, setSoundPrefs, useSoundPrefs } from "@/components/fx/sound";
import { ActionRow, LinkRow, RowGroup, SwitchRow } from "@/components/ui/Rows";
import { useToast } from "@/components/ui/Toast";
import { alertsStore, useLocalAlerts } from "@/lib/local/alerts";
import { clearLocalNotifications, useLocalNotifications } from "@/lib/local/notifications";
import { useLocalReceipts } from "@/lib/local/receipts";
import { useLocalWatchlist, watchlistStore } from "@/lib/local/watchlist";
import { setDisplayPrefs, useDisplayPrefs } from "@/lib/displayPrefs";
import { LOCALE_COOKIE, LOCALES } from "@/lib/i18n/config";

/** Activity shortcuts, data saved on this device, and browser-stored preferences, as grouped rows. No account needed. */
export function PreferencesGroups() {
  const { locale } = useT();
  const router = useRouter();
  const prefs = useDisplayPrefs();
  const sound = useSoundPrefs();
  const toast = useToast();
  const watch = useLocalWatchlist();
  const alerts = useLocalAlerts();
  const notes = useLocalNotifications();
  const receipts = useLocalReceipts();
  const confirmClear = (what: string, run: () => void) => {
    if (!window.confirm(`Clear ${what} from this device? This cannot be undone.`)) return;
    run();
    toast.success("Cleared from this device");
  };
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
        <LinkRow href="/dashboard/watchlist" icon="star" label="Watchlist" hint="Tokens you follow" value={String(watch.length)} />
        <LinkRow href="/alerts" icon="alert" label="Price alerts" hint="Fire while the site is open in a tab" value={String(alerts.length)} />
        <LinkRow href="/notifications" icon="inbox" label="Notifications" hint="Fired alerts and completed payments" value={String(notes.length)} />
        <LinkRow href="/dashboard/receipts" icon="log" label="Receipts" hint="Payments made in this browser" value={String(receipts.length)} />
        <LinkRow href="/profile" icon="dashboard" label="Your device" hint="Everything saved here at a glance" />
      </RowGroup>
      <RowGroup title="Data on this device">
        <ActionRow icon="star" label="Clear watchlist" hint="Removes every followed token from this browser" danger onClick={() => confirmClear("your watchlist", () => watchlistStore.write([]))} />
        <ActionRow icon="alert" label="Clear price alerts" hint="Removes open and fired alerts" danger onClick={() => confirmClear("your price alerts", () => alertsStore.write([]))} />
        <ActionRow icon="inbox" label="Clear notifications" danger onClick={() => confirmClear("your notifications", clearLocalNotifications)} />
      </RowGroup>
      <RowGroup title="Sound and feel">
        <SwitchRow checked={sound.enabled} onChange={(v) => { setSoundPrefs({ enabled: v }); if (v) setTimeout(() => playSound("success"), 30); }} icon="sound" label="Interface sounds" hint="Soft taps, success chimes and alerts. Off by default" />
        <li className="flex min-h-14 items-center gap-3.5 px-4">
          <label htmlFor="pref-volume" className="min-w-0 flex-1 text-[15px] font-semibold">Volume</label>
          <input id="pref-volume" type="range" min={0} max={100} value={Math.round(sound.volume * 100)} onChange={(e) => setSoundPrefs({ volume: Number(e.target.value) / 100 })} onPointerUp={() => playSound("notify")} className="w-40 accent-[var(--brand)]" disabled={!sound.enabled} />
        </li>
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
      <p className="px-1 text-xs text-muted">Everything on this page is stored in this browser only. Navigation and discovery labels are translated, other pages are English for now.</p>
    </div>
  );
}
