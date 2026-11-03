import { Compass } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <span className="icon-tile mx-auto grid h-14 w-14 place-items-center rounded-lg"><Compass size={26} /></span>
      <h1 className="mt-5 font-display text-4xl font-bold">Page not found</h1>
      <p className="mt-2 text-soft">That page does not exist, or the token has no market data yet.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn btn-primary">Back to Discover</Link>
        <Link href="/add-coin" className="btn">List a token</Link>
      </div>
    </div>
  );
}
