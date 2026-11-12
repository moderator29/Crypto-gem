import type { SupabaseClient } from "@supabase/supabase-js";
import { getPlacement } from "@/lib/ads/catalog";
import { EXPLORER_TX, getDirectMethod } from "./methods";
import { PayError } from "./types";
import { numberToDecimal } from "./units";

export interface Receipt {
  receiptNo: string | null;
  orderId: string;
  kind: string;
  priceUsd: number;
  createdAt: string;
  paidAt: string | null;
  payment: { asset: string; networkLabel: string; amount: string; txHash: string | null; explorerTxUrl: string | null; toAddress: string };
  item: { title: string; lines: string[] };
}

const day = (iso: string | null | undefined): string => (iso ? iso.slice(0, 10) : "pending");

function duration(hours: number): string {
  if (hours % 24 === 0) {
    const d = hours / 24;
    return `${d} ${d === 1 ? "day" : "days"}`;
  }
  return `${hours} hours`;
}

async function describeItem(db: SupabaseClient, kind: string, refId: string): Promise<{ title: string; lines: string[] }> {
  if (kind === "boost") {
    const { data: camp } = await db.from("boost_campaigns").select("submission_id,pack_id,starts_at,ends_at").eq("id", refId).maybeSingle();
    if (!camp) return { title: "Boost", lines: [] };
    const [{ data: sub }, { data: pack }] = await Promise.all([
      db.from("token_submissions").select("name,symbol").eq("id", camp.submission_id).maybeSingle(),
      db.from("boost_packs").select("name,duration_hours").eq("id", camp.pack_id).maybeSingle(),
    ]);
    const lines = [
      `Project: ${sub?.name ?? "Unknown"}${sub?.symbol ? ` (${sub.symbol})` : ""}`,
      `Pack: ${pack?.name ?? camp.pack_id}`,
    ];
    if (pack?.duration_hours) lines.push(`Duration: ${duration(Number(pack.duration_hours))}`);
    lines.push(`Starts: ${day(camp.starts_at)}`, `Ends: ${day(camp.ends_at)}`);
    return { title: `Boost for ${sub?.name ?? "your project"}`, lines };
  }
  if (kind === "listing") {
    const { data: sub } = await db.from("token_submissions").select("name,symbol,mode").eq("id", refId).maybeSingle();
    const pkg = sub?.mode === "express" ? "Express listing" : "Standard listing";
    return { title: `Listing for ${sub?.name ?? "your project"}`, lines: [`Project: ${sub?.name ?? "Unknown"}${sub?.symbol ? ` (${sub.symbol})` : ""}`, `Package: ${pkg}`] };
  }
  if (kind === "ad_campaign") {
    const { data: camp } = await db.from("advertising_campaigns").select("placement_id,starts_at,ends_at,headline").eq("id", refId).maybeSingle();
    if (!camp) return { title: "Advertising campaign", lines: [] };
    const placement = getPlacement(camp.placement_id)?.name ?? camp.placement_id;
    return { title: `Advertising: ${placement}`, lines: [`Placement: ${placement}`, `Starts: ${day(camp.starts_at)}`, `Ends: ${day(camp.ends_at)}`] };
  }
  return { title: "Order", lines: [] };
}

/** Receipt for a PAID order owned by the user. Anything else is a 404 so order ids cannot be probed. */
export async function buildReceipt(db: SupabaseClient, userId: string, orderId: string): Promise<Receipt> {
  const { data: order } = await db.from("orders").select("id,kind,ref_id,price_usd,status,created_at,paid_at").eq("id", orderId).eq("user_id", userId).maybeSingle();
  if (!order || order.status !== "paid") throw new PayError("Receipt not found", 404);
  const { data: pay } = await db.from("payments").select("pay_currency,pay_amount,actually_paid,tx_hash,receipt_no").eq("order_id", orderId).eq("provider", "direct").eq("status", "finished").maybeSingle();
  const m = pay ? getDirectMethod(pay.pay_currency) : undefined;
  if (!pay || !m) throw new PayError("Receipt not found", 404);
  return {
    receiptNo: pay.receipt_no ?? null,
    orderId,
    kind: order.kind,
    priceUsd: Number(order.price_usd),
    createdAt: order.created_at,
    paidAt: order.paid_at ?? null,
    payment: {
      asset: m.asset,
      networkLabel: m.networkLabel,
      amount: numberToDecimal(pay.actually_paid ?? pay.pay_amount, 8),
      txHash: pay.tx_hash ?? null,
      explorerTxUrl: pay.tx_hash ? `${EXPLORER_TX[m.networkId]}${pay.tx_hash}` : null,
      toAddress: m.address,
    },
    item: await describeItem(db, order.kind, order.ref_id),
  };
}
