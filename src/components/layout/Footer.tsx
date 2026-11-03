import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export function Footer() {
  return (
    <footer className="pad-nav mx-auto mt-12 w-full max-w-7xl px-4">
      <div className="glass grid gap-8 p-6 md:grid-cols-[1.4fr_1fr_1fr] md:p-8">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-sm text-sm text-soft">Discover crypto momentum early. Live market discovery, token intelligence, listings and promotion for emerging projects.</p>
          <p className="text-xs text-muted">Data from GeckoTerminal and CoinGecko. Not financial advice. Trades happen on external venues with your own wallet.</p>
        </div>
        <nav aria-label="Explore" className="space-y-2 text-sm">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted">Explore</h3>
          <Link className="block text-soft hover:text-text" href="/">Discover</Link>
          <Link className="block text-soft hover:text-text" href="/boost">Boost</Link>
          <Link className="block text-soft hover:text-text" href="/promotion">Promotion</Link>
        </nav>
        <nav aria-label="Projects" className="space-y-2 text-sm">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted">Projects</h3>
          <Link className="block text-soft hover:text-text" href="/add-coin">Apply Listing</Link>
          <Link className="block text-soft hover:text-text" href="/promotion">Book advertising</Link>
          <Link className="block text-soft hover:text-text" href="/login">Sign in</Link>
        </nav>
      </div>
      <p className="py-6 text-center text-xs text-muted">© {new Date().getFullYear()} Crypto Gems</p>
    </footer>
  );
}
