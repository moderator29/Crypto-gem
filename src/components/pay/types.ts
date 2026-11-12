export interface PayMethod {
  id: string;
  asset: string;
  networkId: string;
  networkLabel: string;
  kind: string;
  token: string | null;
  decimals: number;
  note: string;
}

export interface PayIntent {
  paymentId: string;
  methodId: string;
  asset: string;
  networkId: string;
  networkLabel: string;
  address: string;
  amount: string;
  amountUsd: number;
  rate: number | null;
  expiresAt: string;
  minConfirmations: number;
  explorerAddressUrl: string;
  status: string;
}

export type PayPhaseStatus = "waiting" | "confirming" | "finished" | "failed" | "expired";

export interface PayStatus {
  paymentId: string;
  orderId: string;
  status: PayPhaseStatus;
  message: string | null;
  txHash: string | null;
  confirmations: number;
  required: number;
  paidAmount: string | number | null;
  receiptNo: string | null;
}

export interface SubmitResult {
  accepted: boolean;
  reason?: string;
  status: PayPhaseStatus;
  confirmations: number;
  required: number;
  txHash: string | null;
  paidAmount: string | number | null;
  receiptNo: string | null;
  orderId: string;
}

export interface Receipt {
  receiptNo: string;
  orderId: string;
  kind: string;
  priceUsd: number;
  createdAt: string;
  paidAt: string | null;
  payment: { asset: string; networkLabel: string; amount: string; txHash: string | null; explorerTxUrl: string | null; toAddress: string };
  item: { title: string; lines: string[] };
}

export interface OrderInfo {
  id: string;
  kind: string;
  price_usd: number;
  status: string;
  created_at?: string;
  paid_at?: string | null;
}

export interface OrderPayload {
  order: OrderInfo;
  payment: { id: string; status: string; tx_hash?: string | null } | null;
}

export type PayPhase = "choose" | "send" | "confirm" | "done";
