import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import { verifyAccessToken } from "@/lib/auth/privy";

const APP = "app_test_123";
let keys: ReturnType<typeof createLocalJWKSet>;
let priv: CryptoKey;
let otherPriv: CryptoKey;

async function token(over: { sub?: string; iss?: string; aud?: string; exp?: string | number; key?: CryptoKey; alg?: string } = {}) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: "k1" })
    .setSubject(over.sub ?? "did:privy:abc123")
    .setIssuer(over.iss ?? "privy.io")
    .setAudience(over.aud ?? APP)
    .setIssuedAt()
    .setExpirationTime(over.exp ?? "1h")
    .sign(over.key ?? priv);
}

beforeAll(async () => {
  const a = await generateKeyPair("ES256");
  const b = await generateKeyPair("ES256");
  priv = a.privateKey;
  otherPriv = b.privateKey;
  keys = createLocalJWKSet({ keys: [{ ...(await exportJWK(a.publicKey)), kid: "k1", alg: "ES256", use: "sig" }] });
});

describe("Privy access token verification", () => {
  it("accepts a valid token and returns the Privy DID", async () => {
    expect(await verifyAccessToken(await token(), APP, keys)).toBe("did:privy:abc123");
  });
  it("rejects wrong audience, wrong issuer and expired tokens", async () => {
    expect(await verifyAccessToken(await token({ aud: "other_app" }), APP, keys)).toBeNull();
    expect(await verifyAccessToken(await token({ iss: "evil.example" }), APP, keys)).toBeNull();
    expect(await verifyAccessToken(await token({ exp: Math.floor(Date.now() / 1000) - 60 }), APP, keys)).toBeNull();
  });
  it("rejects a token signed by a different key", async () => {
    expect(await verifyAccessToken(await token({ key: otherPriv }), APP, keys)).toBeNull();
  });
  it("rejects a subject that is not a Privy DID", async () => {
    expect(await verifyAccessToken(await token({ sub: "someone-else" }), APP, keys)).toBeNull();
  });
  it("rejects garbage, empty and oversized input without throwing", async () => {
    expect(await verifyAccessToken("not.a.jwt", APP, keys)).toBeNull();
    expect(await verifyAccessToken("", APP, keys)).toBeNull();
    expect(await verifyAccessToken("a".repeat(5000), APP, keys)).toBeNull();
  });
  it("rejects an unsigned alg=none token", async () => {
    const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const none = `${b64({ alg: "none" })}.${b64({ sub: "did:privy:abc123", iss: "privy.io", aud: APP, exp: Math.floor(Date.now() / 1000) + 3600 })}.`;
    expect(await verifyAccessToken(none, APP, keys)).toBeNull();
  });
});
