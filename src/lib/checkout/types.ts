/** Response shapes shared by the checkout API and the checkout pages. No server imports. */

export interface PublicMethod {
  id: string;
  asset: "USDT" | "USDC" | "ETH" | "BNB";
  networkId: string;
  networkLabel: string;
  kind: "erc20" | "native" | "spl";
  token: string | null;
  decimals: number;
  note: string;
}

export interface QuoteResponse {
  token: string;
  methodId: string;
  asset: string;
  networkId: string;
  networkLabel: string;
  address: string;
  amount: string;
  amountNote: string;
  amountUsd: number;
  rate: number | null;
  expiresAt: string;
  minConfirmations: number;
  explorerAddressUrl: string;
  item: { title: string; lines: string[] };
}

export interface ReceiptData {
  v: 1;
  typ: "receipt";
  number: string;
  kind: "boost" | "listing" | "banner";
  title: string;
  lines: string[];
  priceUsd: number;
  methodId: string;
  asset: string;
  networkId: string;
  networkLabel: string;
  /** Amount the quote asked for. */
  amount: string;
  /** Amount the transaction actually delivered. */
  received: string;
  txHash: string;
  explorerTxUrl: string;
  toAddress: string;
  quotedAt: string;
  paidAt: string;
}

export type VerifyStatus = "pending" | "confirming" | "paid" | "rejected";

export interface VerifyResponse {
  status: VerifyStatus;
  confirmations: number;
  required: number;
  message: string;
  receipt?: ReceiptData & { token: string };
}
