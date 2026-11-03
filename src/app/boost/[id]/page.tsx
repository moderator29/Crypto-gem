import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BoostConfigurator } from "@/components/boost/BoostConfigurator";
import { TokenLogo } from "@/components/ui/TokenLogo";
import { BOOST_PACKS, type BoostPack } from "@/lib/ads/catalog";
import { getNetwork } from "@/lib/market-data/networks";
import { getDb, dbConfigured } from "@/lib/db";

export const metadata: Metadata = { title: "Boost packs" };
export const dynamic = "force-dynamic";

export default async function BoostProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !dbConfigured()) notFound();
  const db = getDb();
  const { data: p } = await db.from("token_submissions").select("id,name,symbol,network_id,address,logo_url").eq("id", id).eq("status", "published").maybeSingle();
  if (!p) notFound();

  const { data: rows } = await db.from("boost_packs").select("id,name,credits,duration_hours,price_usd,label,priority,allocations").eq("active", true).order("sort");
  const packs: BoostPack[] = rows?.length
    ? rows.map((r) => ({ id: r.id, name: r.name, credits: r.credits, hours: r.duration_hours, priceUsd: Number(r.price_usd), label: r.label, priority: r.priority ?? 1, allocations: Array.isArray(r.allocations) ? (r.allocations as string[]) : [] }))
    : BOOST_PACKS;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/boost" className="btn !min-h-10 inline-flex"><ArrowLeft size={16} /> Back</Link>
      <header className="glass space-y-4 p-5">
        <div>
          <h1 className="font-display text-2xl font-bold">Boost Packs</h1>
          <p className="text-sm text-soft">Pick a pack, choose a payment network and go live automatically after confirmation.</p>
        </div>
        <div className="glass-flat flex items-center gap-3 p-3">
          <TokenLogo src={p.logo_url} symbol={p.symbol} size={48} />
          <div className="min-w-0">
            <div className="truncate font-semibold">{p.name} <span className="text-muted">{p.symbol}</span></div>
            <div className="num truncate text-xs text-muted">{getNetwork(p.network_id ?? "")?.name ?? ""} {p.address ?? ""}</div>
          </div>
        </div>
      </header>
      <BoostConfigurator submissionId={p.id} project={{ name: p.name, symbol: p.symbol, logo: p.logo_url, network: getNetwork(p.network_id ?? "")?.name ?? null }} packs={packs} />
    </div>
  );
}
