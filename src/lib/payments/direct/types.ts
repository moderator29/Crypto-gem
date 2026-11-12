/** Outcome of looking a submitted transaction up on chain. */
export type TxCheck =
  | { state: "not_found"; message: string }
  | { state: "rejected"; reason: string }
  | { state: "valid"; confirmations: number; required: number; receivedUnits: bigint; blockTime: number | null };

export interface VerifyContext {
  /** Earliest acceptable block time, unix seconds. */
  notBefore: number;
}

export type PayStatus = "waiting" | "confirming" | "finished" | "failed" | "expired";

export interface PaymentView {
  paymentId: string;
  orderId: string;
  status: PayStatus;
  message: string | null;
  txHash: string | null;
  confirmations: number;
  required: number;
  paidAmount: string | null;
  receiptNo: string | null;
  rejected?: boolean;
}

export class PayError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
  }
}
