"use client";

/** CryptoGemCN has no accounts. This keeps the provider slot in the layout as a plain pass-through. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
