import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

export function privyAppId(): string | undefined {
  return process.env.NEXT_PUBLIC_PRIVY_APP_ID || undefined;
}

export function privyConfigured(): boolean {
  return Boolean(privyAppId());
}

let remote: { appId: string; keys: JWTVerifyGetKey } | null = null;

function remoteKeys(appId: string): JWTVerifyGetKey {
  if (!remote || remote.appId !== appId) {
    remote = { appId, keys: createRemoteJWKSet(new URL(`https://auth.privy.io/api/v1/apps/${appId}/jwks.json`), { cooldownDuration: 30_000, timeoutDuration: 5_000 }) };
  }
  return remote.keys;
}

/**
 * Verifies a Privy access token: ES256 signature against the app's published keys,
 * issuer "privy.io", audience equal to our app id, and expiry. Returns the Privy user
 * id (a DID such as "did:privy:abc") or null. Any failure is a null, never a throw.
 */
export async function verifyAccessToken(token: string, appId: string, keys: JWTVerifyGetKey): Promise<string | null> {
  if (!token || token.length > 4096) return null;
  try {
    const { payload } = await jwtVerify(token, keys, { issuer: "privy.io", audience: appId, algorithms: ["ES256"] });
    return typeof payload.sub === "string" && payload.sub.startsWith("did:privy:") ? payload.sub : null;
  } catch {
    return null;
  }
}

/** Resolves the signed-in user from `Authorization: Bearer <Privy access token>`. */
export async function privyUserFromRequest(req: Request): Promise<{ id: string; email: string | null } | null> {
  const appId = privyAppId();
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!appId || !token) return null;
  const id = await verifyAccessToken(token, appId, remoteKeys(appId));
  return id ? { id, email: null } : null;
}
