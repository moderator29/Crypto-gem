import type { DirectMethod } from "./methods";
import { rpcCall, rpcUrl } from "./rpc";
import type { TxCheck, VerifyContext } from "./types";
import { EVM_CONFIRMATIONS, evmAddressEq, parseErc20Transfers, type EvmLog } from "./units";

interface EvmTx {
  to: string | null;
  value: string;
  blockNumber: string | null;
}
interface EvmReceipt {
  status: string;
  blockNumber: string;
  logs: EvmLog[];
}

const hexNum = (h: string): number => Number(BigInt(h));

/**
 * Checks an EVM transaction against the method: right chain, mined and successful, sent to our address
 * (native) or an ERC-20 Transfer of the right token to us, recent enough, and how many confirmations it has.
 * The amount is returned, not judged: the caller decides whether it is enough.
 */
export async function verifyEvmTransfer(method: DirectMethod, txHash: string, ctx: VerifyContext): Promise<TxCheck> {
  const url = rpcUrl(method.networkId);
  const chainId = await rpcCall<string>(url, "eth_chainId", []);
  if (hexNum(chainId) !== method.chainId) throw new Error("RPC is on the wrong chain");

  const tx = await rpcCall<EvmTx | null>(url, "eth_getTransactionByHash", [txHash]);
  if (!tx) return { state: "not_found", message: "Transaction not found yet. We will keep checking." };
  const receipt = await rpcCall<EvmReceipt | null>(url, "eth_getTransactionReceipt", [txHash]);
  if (!receipt || !tx.blockNumber) return { state: "not_found", message: "Transaction is waiting to be mined." };
  if (receipt.status !== "0x1") return { state: "rejected", reason: "That transaction failed on chain." };

  let received: bigint;
  if (method.kind === "native") {
    if (!evmAddressEq(tx.to, method.address)) return { state: "rejected", reason: "That transaction was not sent to our address." };
    received = BigInt(tx.value);
  } else {
    if (!method.token) throw new Error("Method has no token");
    received = parseErc20Transfers(receipt.logs, method.token, method.address);
    if (received === 0n) return { state: "rejected", reason: `No ${method.asset} transfer to our address on ${method.networkLabel} was found in that transaction.` };
  }

  const [latest, block] = await Promise.all([
    rpcCall<string>(url, "eth_blockNumber", []),
    rpcCall<{ timestamp: string } | null>(url, "eth_getBlockByNumber", [receipt.blockNumber, false]),
  ]);
  const blockTime = block ? hexNum(block.timestamp) : null;
  if (blockTime !== null && blockTime < ctx.notBefore) return { state: "rejected", reason: "That transaction is older than this payment request." };
  const confirmations = Math.max(0, hexNum(latest) - hexNum(receipt.blockNumber) + 1);
  return { state: "valid", confirmations, required: EVM_CONFIRMATIONS[method.networkId] ?? 5, receivedUnits: received, blockTime };
}
