"use client";

import { useSearchParams } from "next/navigation";
import type { PoolSummary } from "@/lib/market-data/types";
import { HeatMap, parseMapView } from "./HeatMap";

/** The price map as a page: starts from the view in the address and keeps the address in step so any view can be shared. */
export function MapView({ pools }: { pools: PoolSummary[] }) {
  const params = useSearchParams();
  return <HeatMap pools={pools} syncUrl initial={parseMapView(new URLSearchParams(params.toString()))} />;
}
