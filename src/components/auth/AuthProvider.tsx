"use client";

import { PrivyProvider, usePrivy } from "@privy-io/react-auth";
import { createContext, useContext, useEffect, useMemo } from "react";
import { authConfigured, registerTokenGetter } from "@/lib/auth/client";

interface AuthState {
  configured: boolean;
  ready: boolean;
  authenticated: boolean;
  /** Email or wallet shown in the UI. Never used for authorisation. */
  label: string | null;
  /** Privy DID. Needed once to grant the first admin role. */
  userId: string | null;
  login: () => void;
  logout: () => Promise<void>;
}

const NONE: AuthState = { configured: false, ready: true, authenticated: false, label: null, userId: null, login: () => undefined, logout: async () => undefined };
const Ctx = createContext<AuthState>(NONE);

export function useAuth(): AuthState {
  return useContext(Ctx);
}

function Bridge({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, user, login, logout, getAccessToken } = usePrivy();
  useEffect(() => {
    registerTokenGetter(authenticated ? getAccessToken : null);
    return () => registerTokenGetter(null);
  }, [authenticated, getAccessToken]);
  const labelHint = user?.email?.address ?? user?.google?.email ?? (user?.wallet?.address ? `${user.wallet.address.slice(0, 6)}…${user.wallet.address.slice(-4)}` : null);
  useEffect(() => {
    if (!authenticated || !user?.id) return;
    let live = true;
    void getAccessToken().then((jwt) => {
      if (!live || !jwt) return;
      return fetch("/api/account/sync", { method: "POST", headers: { Authorization: `Bearer ${jwt}`, "content-type": "application/json" }, body: JSON.stringify({ label: labelHint }) }).catch(() => undefined);
    });
    return () => {
      live = false;
    };
  }, [authenticated, user?.id, labelHint, getAccessToken]);
  const value = useMemo<AuthState>(
    () => ({
      configured: true,
      ready,
      authenticated,
      label: user?.email?.address ?? user?.google?.email ?? (user?.wallet?.address ? `${user.wallet.address.slice(0, 6)}…${user.wallet.address.slice(-4)}` : null),
      userId: user?.id ?? null,
      login: () => login(),
      logout,
    }),
    [ready, authenticated, user, login, logout],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * Privy handles sign-in (email code, wallet, Google). Embedded wallets are switched off:
 * CryptoGemCN never creates or holds wallets for users. Without an app id the app runs
 * signed-out and every protected action explains that sign-in is not configured.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  if (!authConfigured() || !appId) return <Ctx.Provider value={NONE}>{children}</Ctx.Provider>;
  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["email", "wallet", "google"],
        appearance: { theme: "dark", accentColor: "#4d8dff", showWalletLoginFirst: false },
        embeddedWallets: { ethereum: { createOnLogin: "off" }, solana: { createOnLogin: "off" } },
      }}
    >
      <Bridge>{children}</Bridge>
    </PrivyProvider>
  );
}
