import { describe, expect, it } from "vitest";
import { addressChunks, amountShortfall, formatAmount, formatCountdown, isEvmTxHash, isSolanaSignature, kindLabel, networkFamily, networkWarning, remainingSeconds, shortHash, validateTxHash } from "@/components/pay/payHelpers";

const EVM = `0x${"a1".repeat(32)}`;
const SOL = "5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW";

describe("hash validators", () => {
  it("accepts a 0x plus 64 hex EVM hash and rejects near misses", () => {
    expect(isEvmTxHash(EVM)).toBe(true);
    expect(isEvmTxHash(` ${EVM} `)).toBe(true);
    expect(isEvmTxHash(EVM.slice(0, -1))).toBe(false);
    expect(isEvmTxHash(`0x${"g".repeat(64)}`)).toBe(false);
    expect(isEvmTxHash(EVM.slice(2))).toBe(false);
  });
  it("accepts base58 signatures of 80 to 90 characters", () => {
    expect(SOL.length).toBeGreaterThanOrEqual(80);
    expect(isSolanaSignature(SOL)).toBe(true);
    expect(isSolanaSignature(SOL.slice(0, 60))).toBe(false);
    expect(isSolanaSignature(`${SOL.slice(0, -1)}0`)).toBe(false);
    expect(isSolanaSignature(`${SOL}${SOL}`)).toBe(false);
  });
  it("gives a calm message per family and none for empty input", () => {
    expect(validateTxHash("evm", "")).toEqual({ ok: false, error: null });
    expect(validateTxHash("evm", EVM).ok).toBe(true);
    expect(validateTxHash("evm", "abc").error).toContain("0x");
    expect(validateTxHash("evm", "0xabc").error).toContain("64");
    expect(validateTxHash("solana", SOL).ok).toBe(true);
    expect(validateTxHash("solana", "short").error).toContain("80 to 90");
  });
  it("maps networks to a family", () => {
    expect(networkFamily("solana")).toBe("solana");
    expect(networkFamily("base")).toBe("evm");
  });
});

describe("address grouping", () => {
  it("keeps every character and highlights the first and last six", () => {
    const addr = "0x1234567890abcdef1234567890abcdef12345678";
    const chunks = addressChunks(addr);
    expect(chunks.map((c) => c.text).join("")).toBe(addr);
    expect(chunks[0]).toEqual({ text: "0x1234", highlight: true });
    expect(chunks[chunks.length - 1]).toEqual({ text: "345678", highlight: true });
    expect(chunks.slice(1, -1).every((c) => !c.highlight && c.text.length <= 4)).toBe(true);
  });
  it("does not split a short string", () => {
    expect(addressChunks("abc")).toEqual([{ text: "abc", highlight: true }]);
  });
  it("shortens long hashes only", () => {
    expect(shortHash(EVM, 6)).toBe(`${EVM.slice(0, 6)}...${EVM.slice(-6)}`);
    expect(shortHash("0xabc")).toBe("0xabc");
  });
});

describe("amount formatting", () => {
  it("groups the whole part and never rounds decimals", () => {
    expect(formatAmount("1234567.123456789")).toBe("1,234,567.123456789");
    expect(formatAmount("0.000123")).toBe("0.000123");
    expect(formatAmount("25")).toBe("25");
    expect(formatAmount("not a number")).toBe("not a number");
  });
  it("computes an exact shortfall", () => {
    expect(amountShortfall("25.5", "10")).toBe("15.5");
    expect(amountShortfall("0.3", "0.1")).toBe("0.2");
    expect(amountShortfall("1", 0.25)).toBe("0.75");
    expect(amountShortfall("5", "5")).toBeNull();
    expect(amountShortfall("5", "0")).toBeNull();
    expect(amountShortfall("5", null)).toBeNull();
    expect(amountShortfall("5", "9")).toBeNull();
  });
});

describe("countdown and labels", () => {
  it("formats minutes and hours and clamps below zero", () => {
    expect(formatCountdown(0)).toBe("0:00");
    expect(formatCountdown(65)).toBe("1:05");
    expect(formatCountdown(3725)).toBe("1:02:05");
    expect(formatCountdown(-20)).toBe("0:00");
  });
  it("derives remaining seconds from the expiry", () => {
    const now = Date.parse("2026-01-01T00:00:00Z");
    expect(remainingSeconds("2026-01-01T00:10:00Z", now)).toBe(600);
    expect(remainingSeconds("2025-12-31T23:00:00Z", now)).toBe(0);
    expect(remainingSeconds("garbage", now)).toBe(0);
  });
  it("words the network warning and order kinds", () => {
    expect(networkWarning("USDC", "Base")).toBe("Send only USDC on Base. Other networks are lost.");
    expect(kindLabel("boost")).toBe("Boost pack");
    expect(kindLabel("ad_campaign")).toBe("Banner campaign");
    expect(kindLabel("listing")).toBe("Token listing");
  });
});
