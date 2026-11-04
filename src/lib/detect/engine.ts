import { classifyAddress, normalizeAddress, sameAddress } from "@/lib/market-data/identifiers";
import { getNetwork, networkFromGecko, NETWORKS } from "@/lib/market-data/networks";
import { coingecko } from "@/lib/market-data/providers/coingecko";
import { coinmarketcap } from "@/lib/market-data/providers/coinmarketcap";
import { birdeye } from "@/lib/market-data/providers/birdeye";
import { dexscreener, networkFromDexScreener } from "@/lib/market-data/providers/dexscreener";
import { dextools } from "@/lib/market-data/providers/dextools";
import { geckoTerminal } from "@/lib/market-data/providers/geckoterminal";
import { ProviderError } from "@/lib/market-data/errors";
import type { PoolSummary } from "@/lib/market-data/types";
import { readErc20, rpcUrl } from "./evmRpc";
import { readSolanaAsset, solanaRpcUrl } from "./solanaRpc";
import type { DetectedToken, DetectEvent, NetworkMatch, Sourced } from "./types";

const sourced = <T>(value: T | null | undefined, source: Sourced<T>["source"]): Sourced<T> | null =>
  value === null || value === undefined || value === "" ? null : { value, source };

/** Pick the first non-null candidate, in provider-priority order. */
const firstOf = <T>(...cands: Array<Sourced<T> | null>): Sourced<T> | null => cands.find((c) => c !== null) ?? null;

function groupMatches(address: string, pools: PoolSummary[]): Map<string, PoolSummary[]> {
  const byNet = new Map<string, PoolSummary[]>();
  for (const p of pools) {
    if (!sameAddress(p.baseToken.address, address) && !(p.quoteToken && sameAddress(p.quoteToken.address, address))) continue;
    byNet.set(p.networkId, [...(byNet.get(p.networkId) ?? []), p]);
  }
  return byNet;
}

function toMatch(networkId: string, address: string, pools: PoolSummary[]): NetworkMatch {
  const net = getNetwork(networkId);
  const top = [...pools].sort((a, b) => (b.liquidityUsd ?? 0) - (a.liquidityUsd ?? 0))[0];
  const tok = top && sameAddress(top.baseToken.address, address) ? top.baseToken : top?.quoteToken ?? top?.baseToken;
  return {
    networkId,
    networkName: net?.name ?? networkId,
    token: { name: tok?.name ?? "", symbol: tok?.symbol ?? "", imageUrl: tok?.imageUrl ?? null },
    topPool: top ? { address: top.address, dex: top.dex, liquidityUsd: top.liquidityUsd, volume24hUsd: top.volumeUsd.h24 } : null,
  };
}

/**
 * Real-time token detection. Yields stage events as real provider calls start
 * and finish, then a single result event. Never fabricates a field: anything
 * no provider returned ends up in `missing`.
 */
export async function* detectToken(rawAddress: string, forcedNetwork?: string): AsyncGenerator<DetectEvent> {
  const address = rawAddress.trim();
  const kind = classifyAddress(address);
  if (kind === "unknown") {
    yield { type: "result", status: "invalid", message: "That does not look like a valid contract address or mint." };
    return;
  }
  if (kind === "bitcoin") {
    yield { type: "result", status: "unsupported", message: "Bitcoin addresses are not token contracts. Use Standard Listing and enter the project details manually." };
    return;
  }

  let networkId = forcedNetwork;
  if (networkId) {
    const forced = getNetwork(networkId);
    if (!forced || !forced.contractLookup) {
      yield { type: "result", status: "unsupported", message: "That network does not support contract lookup. Use Standard Listing." };
      return;
    }
  }

  let searchPools: PoolSummary[] = [];
  let dsPairs: Awaited<ReturnType<typeof dexscreener.tokenPairs>> = [];
  if (!networkId) {
    yield { type: "stage", id: "chain", label: "Detecting token and blockchain…", state: "running" };
    const [gtSearch, dsSearch] = await Promise.allSettled([geckoTerminal.searchPools(address), dexscreener.tokenPairs(address)]);
    if (gtSearch.status === "fulfilled") searchPools = gtSearch.value.pools;
    if (dsSearch.status === "fulfilled") dsPairs = dsSearch.value;
    if (gtSearch.status === "rejected" && dsSearch.status === "rejected") {
      yield { type: "stage", id: "chain", label: "Detecting token and blockchain…", state: "failed" };
      const err = gtSearch.reason;
      const kindMsg = err instanceof ProviderError ? err.kind : "unavailable";
      yield { type: "result", status: "unavailable", message: kindMsg === "rate_limited" ? "The market data providers are rate limited. Try again in a minute, or pick the network manually." : "Market data is temporarily unavailable. Pick the network manually or retry." };
      return;
    }
    yield { type: "stage", id: "chain", label: "Detecting token and blockchain…", state: "done" };
    const groups = groupMatches(address, searchPools);
    const matches = [...groups.entries()].map(([id, pools]) => toMatch(id, address, pools));
    // DexScreener fills in networks GeckoTerminal does not index, or answers alone when GeckoTerminal is down.
    for (const p of dsPairs) {
      const id = networkFromDexScreener(p.chainId);
      if (!id || matches.some((m) => m.networkId === id)) continue;
      const mine = dexscreener.toPools(dsPairs, address, id);
      if (mine.length) matches.push(toMatch(id, address, mine));
    }
    if (matches.length === 0) {
      yield { type: "result", status: "not_found", message: "No trading pool was found for this address on any network we can see. Select the network manually, or the token may have no liquidity yet. Use Standard Listing if it has not launched." };
      return;
    }
    if (matches.length > 1) {
      matches.sort((a, b) => (b.topPool?.liquidityUsd ?? 0) - (a.topPool?.liquidityUsd ?? 0));
      yield { type: "result", status: "multiple", matches, message: "This address exists on more than one network. Confirm the correct one." };
      return;
    }
    networkId = matches[0]!.networkId;
  }

  const net = getNetwork(networkId!);
  if (!net) {
    yield { type: "result", status: "unsupported", message: "Unsupported network." };
    return;
  }
  const gtSlug = net.geckoterminal;
  const canonical = normalizeAddress(address);
  const notes: DetectedToken["providerNotes"] = [];

  yield { type: "stage", id: "onchain", label: "Checking on-chain metadata…", state: rpcUrl(net.id) ? "running" : "skipped" };
  yield { type: "stage", id: "market", label: "Retrieving market information…", state: "running" };
  yield { type: "stage", id: "pairs", label: "Discovering available trading pairs…", state: "running" };

  const settle = async <T>(p: Promise<T>) => p.then((value) => ({ ok: true as const, value }), (error: unknown) => ({ ok: false as const, error }));

  const [rpc, gtToken, gtPools, cgInfo, cmcInfo, dsInfo, dtInfo, beInfo, solAsset] = await Promise.all([
    settle(readErc20(net.id, canonical)),
    gtSlug ? settle(geckoTerminal.token(gtSlug, canonical)) : Promise.resolve(null),
    gtSlug ? settle(geckoTerminal.poolsForToken(gtSlug, canonical)) : Promise.resolve(null),
    net.coingecko ? settle(coingecko.byContract(net.coingecko, canonical)) : Promise.resolve(null),
    coinmarketcap.isConfigured() ? settle(coinmarketcap.byAddress(canonical)) : Promise.resolve(null),
    settle((dsPairs.length ? Promise.resolve(dsPairs) : dexscreener.tokenPairs(address)).then((pairs) => ({ pairs, info: dexscreener.toInfo(pairs, address, net.id) }))),
    dextools.isConfigured() ? settle(dextools.token(net.id, canonical)) : Promise.resolve(null),
    net.id === "solana" && birdeye.isConfigured() ? settle(birdeye.token(address)) : Promise.resolve(null),
    net.id === "solana" && solanaRpcUrl() ? settle(readSolanaAsset(address)) : Promise.resolve(null),
  ]);

  if (rpcUrl(net.id)) yield { type: "stage", id: "onchain", label: "Checking on-chain metadata…", state: rpc.ok && rpc.value ? "done" : "failed" };
  yield { type: "stage", id: "market", label: "Retrieving market information…", state: gtToken?.ok || (cgInfo?.ok && cgInfo.value) ? "done" : "failed" };
  yield { type: "stage", id: "pairs", label: "Discovering available trading pairs…", state: gtPools?.ok ? "done" : "failed" };

  const note = (provider: string, r: { ok: boolean; value?: unknown; error?: unknown } | null, configured = true) => {
    if (!configured) notes.push({ provider, status: "not_configured", detail: "API key not set" });
    else if (!r) notes.push({ provider, status: "failed", detail: "Network not supported by this provider" });
    else if (!r.ok) notes.push({ provider, status: "failed", detail: r.error instanceof ProviderError ? r.error.kind : "error" });
    else if (!r.value) notes.push({ provider, status: "no_match" });
    else notes.push({ provider, status: "ok" });
  };
  note("geckoterminal", gtToken);
  note("coingecko", cgInfo);
  note("coinmarketcap", cmcInfo, coinmarketcap.isConfigured());
  note("dexscreener", dsInfo ? { ok: dsInfo.ok, value: dsInfo.ok ? dsInfo.value.info : undefined, error: dsInfo.ok ? undefined : dsInfo.error } : null);
  note("dextools", dtInfo, dextools.isConfigured());
  if (net.id === "solana") note("birdeye", beInfo, birdeye.isConfigured());
  if (net.id === "solana") note("solana-rpc", solAsset, Boolean(solanaRpcUrl()));
  if (rpcUrl(net.id)) note("rpc", rpc);

  const gt = gtToken?.ok ? gtToken.value : null;
  const ds = dsInfo?.ok ? dsInfo.value.info : null;
  const dt = dtInfo?.ok ? dtInfo.value : null;
  const be = beInfo?.ok ? beInfo.value : null;
  const sol = solAsset?.ok ? solAsset.value : null;
  const gtPoolList = gtPools?.ok ? gtPools.value.pools : searchPools.filter((p) => p.networkId === net.id);
  const pools = gtPoolList.length ? gtPoolList : dsInfo?.ok ? dexscreener.toPools(dsInfo.value.pairs, address, net.id) : [];
  const cg = cgInfo?.ok ? cgInfo.value : null;
  const cmc = cmcInfo?.ok ? cmcInfo.value : null;
  const chain = rpc.ok ? rpc.value : null;
  const oldest = pools.map((p) => p.createdAt).filter((d): d is string => Boolean(d)).sort()[0];

  const decimals = chain?.decimals ?? sol?.decimals ?? gt?.identity?.decimals ?? null;
  const totalSupplyRaw = sol?.totalSupply ? sol.totalSupply : chain?.totalSupplyRaw
    ? (decimals !== null ? (Number(BigInt(chain.totalSupplyRaw)) / 10 ** decimals).toString() : chain.totalSupplyRaw)
    : gt?.totalSupply && decimals !== null
      ? (Number(gt.totalSupply) / 10 ** decimals).toString()
      : null;

  const token: DetectedToken = {
    networkId: net.id,
    networkName: net.name,
    address: canonical,
    name: firstOf(sourced(chain?.name, "rpc"), sourced(sol?.name, "rpc"), sourced(gt?.identity?.name, "geckoterminal"), sourced(ds?.name, "dexscreener"), sourced(cg?.name, "coingecko"), sourced(cmc?.name, "coinmarketcap"), sourced(dt?.name, "dextools"), sourced(be?.name, "birdeye")),
    symbol: firstOf(sourced(chain?.symbol, "rpc"), sourced(sol?.symbol, "rpc"), sourced(gt?.identity?.symbol, "geckoterminal"), sourced(ds?.symbol, "dexscreener"), sourced(cg?.symbol?.toUpperCase(), "coingecko"), sourced(cmc?.symbol, "coinmarketcap"), sourced(dt?.symbol, "dextools"), sourced(be?.symbol, "birdeye")),
    decimals: sourced(decimals, chain?.decimals != null || sol?.decimals != null ? "rpc" : "geckoterminal"),
    logoUrl: firstOf(sourced(gt?.identity?.imageUrl, "geckoterminal"), sourced(ds?.logoUrl, "dexscreener"), sourced(cg?.imageUrl, "coingecko"), sourced(cmc?.logo, "coinmarketcap"), sourced(dt?.logoUrl, "dextools"), sourced(be?.logoUrl, "birdeye"), sourced(sol?.imageUrl, "rpc")),
    totalSupply: sourced(totalSupplyRaw, chain?.totalSupplyRaw || sol?.totalSupply ? "rpc" : "geckoterminal"),
    circulatingSupply: sourced(cg?.circulatingSupply, "coingecko"),
    launchDate: firstOf(sourced(oldest, "geckoterminal"), sourced(ds?.launchDate, "dexscreener"), sourced(cg?.genesisDate, "coingecko"), sourced(dt?.launchDate, "dextools")),
    priceUsd: firstOf(sourced(gt?.priceUsd, "geckoterminal"), sourced(ds?.priceUsd, "dexscreener"), sourced(cg?.priceUsd, "coingecko"), sourced(cmc?.priceUsd, "coinmarketcap"), sourced(be?.priceUsd, "birdeye"), sourced(dt?.priceUsd, "dextools")),
    marketCapUsd: firstOf(sourced(cg?.marketCapUsd, "coingecko"), sourced(cmc?.marketCapUsd, "coinmarketcap"), sourced(gt?.marketCapUsd, "geckoterminal"), sourced(ds?.marketCapUsd, "dexscreener"), sourced(dt?.marketCapUsd, "dextools"), sourced(be?.marketCapUsd, "birdeye")),
    fdvUsd: firstOf(sourced(gt?.fdvUsd, "geckoterminal"), sourced(ds?.fdvUsd, "dexscreener"), sourced(cg?.fdvUsd, "coingecko"), sourced(dt?.fdvUsd, "dextools"), sourced(be?.fdvUsd, "birdeye")),
    volume24hUsd: firstOf(sourced(gt?.volume24hUsd, "geckoterminal"), sourced(ds?.volume24hUsd, "dexscreener"), sourced(cg?.volume24hUsd, "coingecko"), sourced(cmc?.volume24hUsd, "coinmarketcap"), sourced(dt?.volume24hUsd, "dextools"), sourced(be?.volume24hUsd, "birdeye")),
    liquidityUsd: firstOf(sourced(gt?.liquidityUsd, "geckoterminal"), sourced(ds?.liquidityUsd, "dexscreener"), sourced(dt?.liquidityUsd, "dextools"), sourced(be?.liquidityUsd, "birdeye")),
    description: firstOf(sourced(cg?.description, "coingecko"), sourced(dt?.description, "dextools"), sourced(be?.description, "birdeye"), sourced(sol?.description, "rpc")),
    website: firstOf(sourced(cg?.homepage, "coingecko"), sourced(ds?.website, "dexscreener"), sourced(cmc?.website, "coinmarketcap"), sourced(dt?.website, "dextools"), sourced(be?.website, "birdeye")),
    twitter: firstOf(sourced(cg?.twitter, "coingecko"), sourced(ds?.twitter, "dexscreener"), sourced(cmc?.twitter, "coinmarketcap"), sourced(dt?.twitter, "dextools"), sourced(be?.twitter, "birdeye")),
    telegram: firstOf(sourced(cg?.telegram, "coingecko"), sourced(ds?.telegram, "dexscreener"), sourced(cmc?.telegram, "coinmarketcap"), sourced(dt?.telegram, "dextools"), sourced(be?.telegram, "birdeye")),
    discord: firstOf(sourced(cg?.discord, "coingecko"), sourced(ds?.discord, "dexscreener"), sourced(dt?.discord, "dextools"), sourced(be?.discord, "birdeye")),
    coingeckoUrl: sourced(cg?.url, "coingecko"),
    coinmarketcapUrl: sourced(cmc?.url, "coinmarketcap"),
    pools,
    missing: [],
    providerNotes: notes,
    observedAt: new Date().toISOString(),
  };

  const checked: Array<[string, unknown]> = [
    ["name", token.name], ["symbol", token.symbol], ["decimals", token.decimals], ["logo", token.logoUrl],
    ["totalSupply", token.totalSupply], ["launchDate", token.launchDate], ["price", token.priceUsd],
    ["marketCap", token.marketCapUsd], ["liquidity", token.liquidityUsd], ["website", token.website],
    ["twitter", token.twitter], ["telegram", token.telegram], ["description", token.description],
  ];
  token.missing = checked.filter(([, v]) => v === null).map(([k]) => k);

  if (!token.name && !token.symbol && pools.length === 0) {
    yield { type: "result", status: "not_found", message: `No provider recognised this address on ${net.name}. Check the network, retry, or complete the details manually.` };
    return;
  }
  const hardFail = notes.filter((n) => ["geckoterminal", "dexscreener"].includes(n.provider)).every((n) => n.status === "failed");
  yield { type: "result", status: token.missing.length > 3 || hardFail ? "partial" : "found", token };
}

export const SUPPORTED_DETECTION_NETWORKS = NETWORKS.filter((n) => n.contractLookup);
export { networkFromGecko };
