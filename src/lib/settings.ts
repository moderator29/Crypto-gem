export type LoginMethod = "email" | "wallet" | "google";

export interface LinkedAccountLike {
  type: string;
}

const METHODS = new Set(["email", "wallet", "google_oauth"]);

/** Counts accounts that can be used to sign in. Other linked account types do not count. */
export function loginMethodCount(accounts: LinkedAccountLike[]): number {
  return accounts.filter((a) => METHODS.has(a.type)).length;
}

/** A login method may be removed only if another one remains, so a user can never lock themselves out. */
export function canUnlink(accounts: LinkedAccountLike[]): boolean {
  return loginMethodCount(accounts) > 1;
}
