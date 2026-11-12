import type { DirectMethod } from "./methods";
import { rpcCall, rpcUrl } from "./rpc";
import type { TxCheck, VerifyContext } from "./types";
import { parseSolanaTokenDelta, type SolanaMeta } from "./units";

interface SolanaTx {
  blockTime: number | null;
  meta: SolanaMeta | null;
}

/** Checks a Solana USDC transfer: executed without error and our token balance rose. "confirmed" commitment is sufficient. */
export async function verifySolanaTransfer(method: DirectMethod, signature: string, ctx: VerifyContext): Promise<TxCheck> {
  if (!method.token) throw new Error("Method has no mint");
  const tx = await rpcCall<SolanaTx | null>(rpcUrl("solana"), "getTransaction", [signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0, commitment: "confirmed" }]);
  if (!tx || !tx.meta) return { state: "not_found", message: "Transaction not found yet. We will keep checking." };
  if (tx.meta.err !== null && tx.meta.err !== undefined) return { state: "rejected", reason: "That transaction failed on chain." };
  const delta = parseSolanaTokenDelta(tx.meta, method.address, method.token);
  if (delta <= 0n) return { state: "rejected", reason: "No USDC transfer to our address on Solana was found in that transaction." };
  if (tx.blockTime !== null && tx.blockTime < ctx.notBefore) return { state: "rejected", reason: "That transaction is older than this payment request." };
  return { state: "valid", confirmations: 1, required: 1, receivedUnits: delta, blockTime: tx.blockTime };
}
