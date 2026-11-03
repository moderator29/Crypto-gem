import { keccak_256 } from "@noble/hashes/sha3";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils";

const CDN = "https://assets-cdn.trustwallet.com/blockchains";

/** Our network ids mapped to Trust Wallet asset folder names. */
const FOLDER: Record<string, string> = {
  ethereum: "ethereum", solana: "solana", bsc: "smartchain", base: "base", arbitrum: "arbitrum", optimism: "optimism",
  polygon: "polygon", avalanche: "avalanchec", fantom: "fantom", sonic: "sonic", linea: "linea", zksync: "zksync",
  scroll: "scroll", mantle: "mantle", blast: "blast", celo: "celo", cronos: "cronos", gnosis: "xdai",
  moonbeam: "moonbeam", moonriver: "moonriver", aurora: "aurora", opbnb: "opbnb", ton: "ton", tron: "tron",
  sui: "sui", aptos: "aptos", near: "near", bitcoin: "bitcoin", cardano: "cardano", polkadot: "polkadot",
};

/** EIP-55 mixed-case checksum, which is how the asset repository names token folders. */
export function checksumAddress(address: string): string {
  const hex = address.slice(2).toLowerCase();
  const hash = bytesToHex(keccak_256(utf8ToBytes(hex)));
  let out = "0x";
  for (let i = 0; i < hex.length; i++) out += parseInt(hash.charAt(i), 16) >= 8 ? hex.charAt(i).toUpperCase() : hex.charAt(i);
  return out;
}

export function trustChainLogo(networkId: string): string | null {
  const folder = FOLDER[networkId];
  return folder ? `${CDN}/${folder}/info/logo.png` : null;
}

/** Trust Wallet token logo URL, or null when the chain or address shape is not covered. */
export function trustTokenLogo(networkId: string, address: string | null | undefined): string | null {
  const folder = FOLDER[networkId];
  if (!folder || !address) return null;
  if (/^0x[0-9a-fA-F]{40}$/.test(address)) return `${CDN}/${folder}/assets/${checksumAddress(address)}/logo.png`;
  if (networkId === "solana" || networkId === "tron" || networkId === "ton" || networkId === "sui" || networkId === "aptos") {
    return `${CDN}/${folder}/assets/${address}/logo.png`;
  }
  return null;
}
