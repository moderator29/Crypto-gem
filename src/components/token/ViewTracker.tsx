"use client";

import { useEffect } from "react";
import { rememberToken } from "@/lib/recentTokens";

/** Renders nothing. Records the token in this browser's recently viewed list. */
export function ViewTracker({ network, address, symbol, name, logo }: { network: string; address: string; symbol: string; name: string; logo: string | null }) {
  useEffect(() => {
    rememberToken({ network, address, symbol, name, logo });
  }, [network, address, symbol, name, logo]);
  return null;
}
