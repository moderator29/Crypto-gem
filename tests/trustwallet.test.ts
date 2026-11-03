import { describe, expect, it } from "vitest";
import { checksumAddress, trustChainLogo, trustTokenLogo } from "@/lib/trustwallet";
import { isPresentable } from "@/lib/market-data/quality";

describe("trust wallet urls", () => {
  it("checksums per EIP-55", () => {
    expect(checksumAddress("0xfb6916095ca1df60bb79ce92ce3ea74c37c5d359")).toBe("0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359");
    expect(checksumAddress("0xdac17f958d2ee523a2206206994597c13d831ec7")).toBe("0xdAC17F958D2ee523a2206206994597C13D831ec7");
  });
  it("maps chains and tokens", () => {
    expect(trustChainLogo("bsc")).toContain("/smartchain/info/logo.png");
    expect(trustTokenLogo("ethereum", "0xdac17f958d2ee523a2206206994597c13d831ec7")).toContain("/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png");
    expect(trustTokenLogo("solana", "So11111111111111111111111111111111111111112")).toContain("/solana/assets/So111");
    expect(trustTokenLogo("robinhood", "0xdac17f958d2ee523a2206206994597c13d831ec7")).toBeNull();
  });
  it("filters abusive names", () => {
    expect(isPresentable("nigga there is hope", "HOPE")).toBe(false);
    expect(isPresentable("Pepe", "PEPE")).toBe(true);
  });
});
