import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { getT } from "@/lib/i18n/server";

export async function Footer() {
  const { t } = await getT();
  return (
    <footer className="pad-nav mx-auto mt-12 w-full max-w-[1360px] px-4">
      <div className="glass grid gap-8 p-6 md:grid-cols-[1.4fr_1fr_1fr] md:p-8">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-sm text-sm text-soft">{t("footer.tagline")}</p>
          <p className="text-xs text-muted">Data from GeckoTerminal and CoinGecko. Not financial advice. Trades happen on external venues with your own wallet.</p>
        </div>
        <nav aria-label="Explore" className="space-y-2 text-sm">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted">{t("footer.explore")}</h3>
          <Link className="block text-soft hover:text-text" href="/">{t("nav.discover")}</Link>
          <Link className="block text-soft hover:text-text" href="/boost">{t("nav.boost")}</Link>
          <Link className="block text-soft hover:text-text" href="/promotion">{t("nav.promotion")}</Link>
        </nav>
        <nav aria-label="Projects" className="space-y-2 text-sm">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted">{t("footer.projects")}</h3>
          <Link className="block text-soft hover:text-text" href="/add-coin">{t("nav.applyListing")}</Link>
          <Link className="block text-soft hover:text-text" href="/promotion">{t("footer.bookAds")}</Link>
          <Link className="block text-soft hover:text-text" href="/dashboard">{t("nav.dashboard")}</Link>
          <Link className="block text-soft hover:text-text" href="/login">{t("footer.signIn")}</Link>
        </nav>
      </div>
      <p className="py-6 text-center text-xs text-muted">© {new Date().getFullYear()} Crypto Gems</p>
    </footer>
  );
}
