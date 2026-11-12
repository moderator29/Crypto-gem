"use client";

import { createLocalList, isRecord, str } from "./store";

/** A payment receipt saved in this browser by the checkout, under the key "cg:receipts". */
export interface LocalReceipt { number: string; href: string; title: string; amount: number | string; asset: string; at: number | string }

const isReceipt = (x: unknown): x is LocalReceipt =>
  isRecord(x) && str(x.number) && str(x.href) && str(x.title) && (typeof x.amount === "number" || str(x.amount)) && str(x.asset) && (typeof x.at === "number" || str(x.at));

export const receiptsStore = createLocalList<LocalReceipt>("cg:receipts", isReceipt, 200);

/** Saves a receipt on this device, newest first. A receipt with the same number replaces the old copy. */
export function saveLocalReceipt(r: LocalReceipt): void {
  receiptsStore.update((list) => [r, ...list.filter((x) => x.number !== r.number)]);
}

export function removeLocalReceipt(number: string): void {
  receiptsStore.update((list) => list.filter((x) => x.number !== number));
}

/** Milliseconds since epoch for a receipt time stored as a number or an ISO string. NaN when unreadable. */
export const receiptTime = (r: Pick<LocalReceipt, "at">): number => (typeof r.at === "number" ? r.at : Date.parse(r.at));

export const useLocalReceipts = receiptsStore.use;
