"use client";

import { CircleDollarSign, Clock, Megaphone, Receipt, ShieldCheck, Hourglass } from "lucide-react";
import { useAdminQuery } from "./api";
import { Loading, Notice, PageTitle, fmtUsd } from "./ui";

interface Overview {
  pendingSubmissions: number;
  publishedListings: number;
  pendingPayments: number;
  paidOrders: number;
  grossPaidRevenueUsd: number;
  revenuePartial: boolean;
  activeCampaigns: number;
}

export function OverviewView() {
  const { data, error, loading, status } = useAdminQuery<Overview>("/api/admin/overview");
  const stats = data
    ? [
        { label: "Pending submissions", value: String(data.pendingSubmissions), icon: Clock },
        { label: "Published listings", value: String(data.publishedListings), icon: ShieldCheck },
        { label: "Pending payments", value: String(data.pendingPayments), icon: Hourglass },
        { label: "Paid orders", value: String(data.paidOrders), icon: Receipt },
        { label: "Gross paid revenue", value: fmtUsd(data.grossPaidRevenueUsd), icon: CircleDollarSign },
        { label: "Active campaigns", value: String(data.activeCampaigns), icon: Megaphone },
      ]
    : [];
  return (
    <>
      <PageTitle title="Overview" hint="Live counts from the database. Revenue is the sum of paid orders in USD." />
      {loading && <Loading />}
      {!loading && error && <Notice tone={status === 403 ? "info" : "error"}>{status === 403 ? "Your role does not include the overview. Use the sections above." : error}</Notice>}
      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {stats.map((s) => (
              <div key={s.label} className="card-flat min-w-0 space-y-2 p-4">
                <s.icon size={18} className="text-brand" />
                <p className="break-words text-xl font-bold sm:text-2xl">{s.value}</p>
                <p className="text-xs text-muted sm:text-sm">{s.label}</p>
              </div>
            ))}
          </div>
          {data.revenuePartial && <div className="mt-3"><Notice>Revenue covers the first 20,000 paid orders only. Use a database query for the exact total.</Notice></div>}
        </>
      )}
    </>
  );
}
