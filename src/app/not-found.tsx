import Link from "next/link";
import { GemMark } from "@/components/ui/Logo";

export default function NotFound() {
  return (
    <div className="relative mx-auto max-w-lg overflow-hidden py-16 text-center">
      <div className="fx-aurora" aria-hidden="true"><i /><i /><i /></div>
      <div className="relative z-10">
        <div className="relative mx-auto h-36 w-36" aria-hidden="true">
          <svg viewBox="0 0 120 120" width="144" height="144" fill="none" className="absolute inset-0">
            <circle className="art-orbit" cx="60" cy="60" r="54" stroke="var(--line-2)" strokeWidth="1.5" strokeDasharray="3 9" strokeLinecap="round" />
            <circle className="art-twinkle" cx="16" cy="34" r="3" fill="var(--brand)" />
            <circle className="art-twinkle" cx="104" cy="82" r="2.5" fill="var(--brand-2)" />
            <circle className="art-twinkle" cx="92" cy="20" r="2" fill="var(--warm)" />
          </svg>
          <span className="fx-float absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"><GemMark size={56} /></span>
        </div>
        <p className="num neon-text text-6xl font-bold tracking-tight">404</p>
        <h1 className="h1 mt-2">Page not found</h1>
        <p className="mt-2 text-soft">That page does not exist, or the token has no market data yet.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn btn-primary">Back to Discover</Link>
          <Link href="/add-coin" className="btn">List a token</Link>
          <Link href="/help" className="btn btn-ghost">Get help</Link>
        </div>
      </div>
    </div>
  );
}
