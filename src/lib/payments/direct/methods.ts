/**
 * Direct crypto payments: the buyer sends funds from their own wallet to the platform's receiving wallets,
 * and the server confirms the transfer on chain. No custody, no intermediary.
 *
 * Receiving addresses can be overridden with PAY_EVM_ADDRESS and PAY_SOLANA_ADDRESS.
 */
export const EVM_ADDRESS = (process.env.PAY_EVM_ADDRESS || "0xC7d230a8cA196487F9F9302298A006D3c6b59808").trim();
export const SOLANA_ADDRESS = (process.env.PAY_SOLANA_ADDRESS || "BuWrrvNMvkqH7Y7rJsYpr3bNJWU7HNpLbydeabhFuXLL").trim();

export type DirectAsset = "USDT" | "USDC" | "ETH" | "BNB";
export type DirectKind = "erc20" | "native" | "spl";

export interface DirectMethod {
  id: string;
  asset: DirectAsset;
  /** Our network id: ethereum, bsc, base, arbitrum or solana. */
  networkId: string;
  networkLabel: string;
  kind: DirectKind;
  /** ERC-20 contract (checksummed) or SPL mint. Absent for native coins. */
  token?: string;
  decimals: number;
  /** Where the buyer sends funds. */
  address: string;
  /** CoinGecko coin id used to price native coins. Stablecoins are 1 USD. */
  priceId?: string;
  /** EVM chain id, used to confirm the RPC is on the right chain. */
  chainId?: number;
}

const evm = (m: Omit<DirectMethod, "address">): DirectMethod => ({ ...m, address: EVM_ADDRESS });

export const DIRECT_METHODS: DirectMethod[] = [
  evm({ id: "usdt-ethereum", asset: "USDT", networkId: "ethereum", networkLabel: "Ethereum", kind: "erc20", token: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6, chainId: 1 }),
  evm({ id: "usdt-bsc", asset: "USDT", networkId: "bsc", networkLabel: "BNB Smart Chain", kind: "erc20", token: "0x55d398326f99059fF775485246999027B3197955", decimals: 18, chainId: 56 }),
  evm({ id: "usdc-ethereum", asset: "USDC", networkId: "ethereum", networkLabel: "Ethereum", kind: "erc20", token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6, chainId: 1 }),
  evm({ id: "usdc-base", asset: "USDC", networkId: "base", networkLabel: "Base", kind: "erc20", token: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6, chainId: 8453 }),
  evm({ id: "usdc-bsc", asset: "USDC", networkId: "bsc", networkLabel: "BNB Smart Chain", kind: "erc20", token: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", decimals: 18, chainId: 56 }),
  evm({ id: "usdc-arbitrum", asset: "USDC", networkId: "arbitrum", networkLabel: "Arbitrum One", kind: "erc20", token: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", decimals: 6, chainId: 42161 }),
  evm({ id: "eth-ethereum", asset: "ETH", networkId: "ethereum", networkLabel: "Ethereum", kind: "native", decimals: 18, priceId: "ethereum", chainId: 1 }),
  evm({ id: "eth-base", asset: "ETH", networkId: "base", networkLabel: "Base", kind: "native", decimals: 18, priceId: "ethereum", chainId: 8453 }),
  evm({ id: "eth-arbitrum", asset: "ETH", networkId: "arbitrum", networkLabel: "Arbitrum One", kind: "native", decimals: 18, priceId: "ethereum", chainId: 42161 }),
  evm({ id: "bnb-bsc", asset: "BNB", networkId: "bsc", networkLabel: "BNB Smart Chain", kind: "native", decimals: 18, priceId: "binancecoin", chainId: 56 }),
  { id: "usdc-solana", asset: "USDC", networkId: "solana", networkLabel: "Solana", kind: "spl", token: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", decimals: 6, address: SOLANA_ADDRESS },
];

export const getDirectMethod = (id: string): DirectMethod | undefined => DIRECT_METHODS.find((m) => m.id === id);

/** Public RPC defaults. RPC_<NETWORK> (for example RPC_ETHEREUM, RPC_SOLANA) overrides them. */
export const DEFAULT_RPC: Record<string, string> = {
  ethereum: "https://ethereum-rpc.publicnode.com",
  bsc: "https://bsc-rpc.publicnode.com",
  base: "https://mainnet.base.org",
  arbitrum: "https://arb1.arbitrum.io/rpc",
  solana: "https://api.mainnet-beta.solana.com",
};

export const EXPLORER_TX: Record<string, string> = {
  ethereum: "https://etherscan.io/tx/",
  bsc: "https://bscscan.com/tx/",
  base: "https://basescan.org/tx/",
  arbitrum: "https://arbiscan.io/tx/",
  solana: "https://solscan.io/tx/",
};

export const EXPLORER_ADDRESS: Record<string, string> = {
  ethereum: "https://etherscan.io/address/",
  bsc: "https://bscscan.com/address/",
  base: "https://basescan.org/address/",
  arbitrum: "https://arbiscan.io/address/",
  solana: "https://solscan.io/account/",
};
