import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { getT } from "@/lib/i18n/server";

export async function Footer() {
  const { t } = await getT();
  return (
    <footer className="mx-auto mt-12 w-full max-w-[1240px] px-4">
      <div className="card grid gap-8 p-6 md:grid-cols-[1.4fr_1fr_1fr] md:p-8">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-sm text-sm text-soft">{t("footer.tagline")}</p>
          <p className="text-xs text-muted">Data from GeckoTerminal and CoinGecko. Not financial advice. Trades happen on external venues with your own wallet.</p>
        </div>
        <nav aria-label="Explore" className="space-y-2 text-sm">
          <h3 className="eyebrow mb-3">{t("footer.explore")}</h3>
          <Link className="block text-soft transition hover:text-text" href="/markets">{t("nav.markets")}</Link>
          <Link className="block text-soft transition hover:text-text" href="/chains">Chains</Link>
          <Link className="block text-soft transition hover:text-text" href="/pulse">{t("nav.pulse")}</Link>
          <Link className="block text-soft transition hover:text-text" href="/copilot">{t("nav.copilot")}</Link>
        </nav>
        <nav aria-label="Projects" className="space-y-2 text-sm">
          <h3 className="eyebrow mb-3">{t("footer.projects")}</h3>
          <Link className="block text-soft transition hover:text-text" href="/add-coin">{t("nav.applyListing")}</Link>
          <Link className="block text-soft transition hover:text-text" href="/boost">{t("nav.boost")}</Link>
          <Link className="block text-soft transition hover:text-text" href="/promotion">{t("footer.bookAds")}</Link>
          <Link className="block text-soft transition hover:text-text" href="/dashboard">{t("nav.dashboard")}</Link>
          <Link className="block text-soft transition hover:text-text" href="/settings">{t("nav.settings")}</Link>
        </nav>
      </div>
      <p className="flex flex-wrap items-center justify-center gap-x-4 pt-6 text-xs text-muted"><Link href="/about" className="hover:text-text">About</Link><Link href="/privacy" className="hover:text-text">Privacy</Link><Link href="/terms" className="hover:text-text">Terms</Link></p>
      <p className="pb-6 pt-2 text-center text-xs text-muted">©{new Date().getFullYear()} Crypto Gems</p>
    </footer>
  );
}
