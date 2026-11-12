import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { validPack } from "@/components/boost/packSelection";
import { BoostConfigurator } from "@/components/boost/BoostConfigurator";
import { ContactCard } from "@/components/ui/ContactCard";
import { TokenLogo } from "@/components/ui/TokenLogo";
import { BOOST_PACKS, type BoostPack } from "@/lib/ads/catalog";
import { getNetwork } from "@/lib/market-data/networks";
import { supabaseAdmin, supabaseConfigured } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Boost packs" };
export const dynamic = "force-dynamic";

export default async function BoostProjectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ pack?: string }> }) {
  const { id } = await params;
  const { pack } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !supabaseConfigured()) notFound();
  const db = supabaseAdmin();
  const { data: p } = await db.from("token_submissions").select("id,name,symbol,network_id,address,logo_url").eq("id", id).eq("status", "published").maybeSingle();
  if (!p) notFound();

  const { data: rows } = await db.from("boost_packs").select("id,name,credits,duration_hours,price_usd,label,priority,allocations").eq("active", true).order("sort");
  const packs: BoostPack[] = rows?.length
    ? rows.map((r) => ({ id: r.id, name: r.name, credits: r.credits, hours: r.duration_hours, priceUsd: Number(r.price_usd), label: r.label, priority: r.priority ?? 1, allocations: Array.isArray(r.allocations) ? (r.allocations as string[]) : [] }))
    : BOOST_PACKS;

  return (
    <div className="space-y-5">
      <Link href="/boost" className="btn btn-sm inline-flex"><ArrowLeft size={16} /> Back</Link>
      <header className="card space-y-4 p-5">
        <div>
          <h1 className="font-display text-2xl font-bold">Boost Packs</h1>
          <p className="text-sm text-soft">Pick a pack, continue to payment and go live automatically after on-chain confirmation.</p>
        </div>
        <div className="card-flat flex items-center gap-3 p-3">
          <TokenLogo src={p.logo_url} symbol={p.symbol} size={48} />
          <div className="min-w-0">
            <div className="truncate font-semibold">{p.name} <span className="text-muted">{p.symbol}</span></div>
            <div className="num truncate text-xs text-muted">{getNetwork(p.network_id ?? "")?.name ?? ""} {p.address ?? ""}</div>
          </div>
        </div>
      </header>
      <ContactCard variant="inline" title="Questions about this boost?" />
      <BoostConfigurator initialPackId={validPack(pack, packs)} submissionId={p.id} project={{ name: p.name, symbol: p.symbol, logo: p.logo_url, network: getNetwork(p.network_id ?? "")?.name ?? null, networkId: p.network_id ?? null, address: p.address ?? null }} packs={packs} />
    </div>
  );
}
