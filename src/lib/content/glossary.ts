import { slugify } from "./learnTypes";

export interface GlossaryTerm {
  term: string;
  /** Anchor id used for deep links such as /glossary#slippage. */
  slug: string;
  definition: string;
  /** Slugs of related terms. */
  related: string[];
}

const RAW: Array<{ term: string; definition: string; related: string[] }> = [
  { term: "Airdrop", definition: "A free distribution of tokens to wallets, usually to reward early users or to promote a project. Unsolicited airdrops are a common bait: interacting with an unknown token can lead to a harmful approval.", related: ["wallet", "allowance", "rug-pull"] },
  { term: "Allowance", definition: "Permission you give a smart contract to move up to a set amount of one of your tokens. It stays active until you revoke it, which is why old allowances are worth cleaning up.", related: ["revoke", "smart-contract", "wallet"] },
  { term: "AMM", definition: "Automated market maker. An exchange design where trades happen against a pool of tokens and the price follows a formula, instead of matching buyers and sellers in an order book.", related: ["liquidity-pool", "dex", "impermanent-loss"] },
  { term: "APR", definition: "Annual percentage rate. The yearly rate earned or charged without counting interest on interest. A 10% APR on 1,000 pays 100 over a year if nothing is added back.", related: ["apy", "staking", "yield"] },
  { term: "APY", definition: "Annual percentage yield. The yearly rate once rewards are added back and also earn. It is always at least the APR, and the gap grows the more often rewards compound.", related: ["apr", "staking", "yield"] },
  { term: "Arbitrage", definition: "Buying an asset where it is cheaper and selling it where it is dearer at the same time to earn the difference. It keeps prices on different venues consistent.", related: ["dex", "mev"] },
  { term: "ATH", definition: "All-time high. The highest price an asset has ever reached. A price far below its ATH is not automatically cheap, because the reasons for the fall still matter.", related: ["bull-market", "market-cap"] },
  { term: "Bear market", definition: "A long stretch of falling prices and low confidence. There is no exact threshold, but a fall of 20% or more from a recent high is a common rule of thumb.", related: ["bull-market", "dca"] },
  { term: "Block explorer", definition: "A website that lets anyone look up transactions, addresses and contracts on a blockchain. It is the neutral place to confirm that a transfer happened or what a contract can do.", related: ["contract-address", "wallet"] },
  { term: "Bridge", definition: "A service that moves value between chains, usually by locking or burning tokens on one chain and releasing or minting a matching token on the other. Bridges hold large pools and are frequent exploit targets.", related: ["wrapped-token", "gas"] },
  { term: "Bull market", definition: "A long stretch of rising prices and strong confidence. Like a bear market it has no exact definition and is usually only obvious in hindsight.", related: ["bear-market", "ath"] },
  { term: "Burn", definition: "Sending tokens to an address nobody controls so they can never be used again. Burning reduces supply permanently.", related: ["circulating-supply", "total-supply", "mint"] },
  { term: "Circulating supply", definition: "The number of tokens that exist and can be traded right now. Locked, unreleased and burned tokens are not counted. Market cap uses this figure.", related: ["total-supply", "max-supply", "market-cap"] },
  { term: "Cliff", definition: "The opening stretch of a vesting schedule during which nothing more unlocks. Once the cliff ends, tokens begin to release.", related: ["vesting", "token-unlock"] },
  { term: "Cold wallet", definition: "A wallet whose keys are kept offline, such as on a hardware device. It is harder to attack remotely than a wallet on a connected phone or browser.", related: ["hot-wallet", "private-key", "seed-phrase"] },
  { term: "Contract address", definition: "The unique address of a smart contract or token on a chain. It is what identifies the real token, since names and tickers can be copied. Always check the address, not only the name.", related: ["smart-contract", "block-explorer", "rug-pull"] },
  { term: "DCA", definition: "Dollar-cost averaging. Buying a fixed dollar amount on a regular schedule instead of all at once. It spreads the entry price across time and does not guarantee a profit.", related: ["bear-market", "bull-market"] },
  { term: "DeFi", definition: "Decentralised finance. Financial services such as trading, lending and staking built from smart contracts rather than run by a company.", related: ["smart-contract", "dex", "staking"] },
  { term: "DEX", definition: "Decentralised exchange. A venue where you swap tokens directly from your own wallet, usually against a liquidity pool, without handing funds to a company.", related: ["amm", "liquidity-pool", "swap"] },
  { term: "FDV", definition: "Fully diluted value. The price multiplied by the maximum supply, as if every token already existed. Comparing it with market cap shows how much supply is still to come.", related: ["market-cap", "circulating-supply", "max-supply"] },
  { term: "Gas", definition: "The fee paid to the network to process a transaction. It is paid in the chain's native token and rises when the network is busy.", related: ["native-token", "block-explorer"] },
  { term: "Honeypot", definition: "A token whose contract lets you buy but blocks selling, or takes almost everything as a fee when you sell. The chart can look healthy because buys keep succeeding.", related: ["rug-pull", "smart-contract", "slippage"] },
  { term: "Hot wallet", definition: "A wallet that is connected to the internet, such as a browser extension or phone app. It is convenient for daily use and more exposed than a cold wallet.", related: ["cold-wallet", "wallet", "private-key"] },
  { term: "Impermanent loss", definition: "The value a liquidity provider gives up compared with simply holding the same tokens, when the prices of the two tokens drift apart. It shrinks if the ratio returns to where it started.", related: ["liquidity-pool", "amm"] },
  { term: "Leverage", definition: "Borrowing to open a position larger than your own funds. It multiplies gains and losses alike, and it brings a liquidation price.", related: ["liquidation", "maintenance-margin"] },
  { term: "Liquidation", definition: "The forced closing of a leveraged position when losses leave too little margin behind it. The price at which this happens is the liquidation price.", related: ["leverage", "maintenance-margin"] },
  { term: "Liquidity", definition: "How much you can buy or sell without moving the price much. On a DEX it is the value held in the trading pool.", related: ["liquidity-pool", "slippage", "price-impact"] },
  { term: "Liquidity pool", definition: "A pair or group of tokens deposited by liquidity providers so that others can trade against them. Providers earn fees and carry impermanent loss risk.", related: ["liquidity", "amm", "impermanent-loss"] },
  { term: "Maintenance margin", definition: "The minimum equity a leveraged position must keep to stay open. When equity falls to this level, the position is liquidated.", related: ["liquidation", "leverage"] },
  { term: "Market cap", definition: "Price multiplied by circulating supply. It is a size measure, not the amount of money that could be sold, so compare it with liquidity.", related: ["fdv", "circulating-supply", "liquidity"] },
  { term: "Max supply", definition: "The most tokens that can ever exist, if the project sets a cap. Some tokens have no cap, in which case FDV may be unknown.", related: ["total-supply", "fdv", "circulating-supply"] },
  { term: "MEV", definition: "Maximal extractable value. Profit that block builders and bots earn by choosing which transactions to include and in what order. Some forms are harmless, such as arbitrage. Sandwich attacks take directly from traders.", related: ["slippage", "arbitrage", "price-impact"] },
  { term: "Mint", definition: "Creating new tokens. Who is allowed to mint, and how much, is one of the most important things to check in a token contract.", related: ["burn", "total-supply", "smart-contract"] },
  { term: "Native token", definition: "The coin a chain uses to pay fees, for example ETH on Ethereum or SOL on Solana. You need a little of it to do anything on that chain.", related: ["gas", "bridge"] },
  { term: "Price impact", definition: "How far your own trade moves the pool price. It depends on your size compared with the pool and can be seen before you sign.", related: ["slippage", "liquidity", "liquidity-pool"] },
  { term: "Private key", definition: "The secret that proves you own a wallet and signs its transactions. Anyone who has it controls the funds, so it must never be shared.", related: ["seed-phrase", "wallet", "cold-wallet"] },
  { term: "Pump and dump", definition: "Coordinated buying meant to lift a price so the organisers can sell to people who arrive later. Thin liquidity makes it easier.", related: ["rug-pull", "wash-trading", "volume"] },
  { term: "Revoke", definition: "To cancel an allowance so a contract can no longer move your tokens. Revoking is an on-chain transaction and costs a small fee. It does not return anything already taken.", related: ["allowance", "wallet"] },
  { term: "Rug pull", definition: "An exit scam where the team removes the liquidity or sells a hidden stash, leaving buyers with tokens nobody will pay for.", related: ["honeypot", "liquidity-pool", "contract-address"] },
  { term: "Seed phrase", definition: "An ordered list of words, commonly 12 or 24, that can recreate a wallet and all its keys. Store it offline and never type it into a website.", related: ["private-key", "wallet", "cold-wallet"] },
  { term: "Slippage", definition: "The gap between the price you were quoted and the price you actually get, caused by the market moving before your transaction is included. Your slippage setting is the most you will accept.", related: ["price-impact", "mev", "swap"] },
  { term: "Smart contract", definition: "A program on a blockchain that runs exactly as written. It cannot be changed unless it was built to be upgradeable, and mistakes in it can be exploited.", related: ["contract-address", "allowance", "defi"] },
  { term: "Stablecoin", definition: "A token designed to hold a steady value, usually one US dollar. The method differs by coin, and any of them can lose its peg.", related: ["liquidity", "defi"] },
  { term: "Staking", definition: "Locking tokens to help secure a network or to earn rewards. Rates change over time, rewards may be paid in a volatile token, and some stakes have lock-up or unbonding periods.", related: ["apr", "apy", "yield"] },
  { term: "Swap", definition: "Exchanging one token for another, typically against a liquidity pool on a DEX. You pay a pool fee and a network fee, and you may face price impact.", related: ["dex", "slippage", "gas"] },
  { term: "Token unlock", definition: "A scheduled release of tokens that were previously locked, such as team or investor allocations. Unlocks add to circulating supply.", related: ["vesting", "cliff", "circulating-supply"] },
  { term: "Tokenomics", definition: "How a token's supply, distribution, release schedule and uses are designed. It tells you who holds the tokens and when more will arrive.", related: ["vesting", "max-supply", "fdv"] },
  { term: "Total supply", definition: "Every token that currently exists, including locked ones but excluding burned ones. It is at least the circulating supply and at most the maximum supply.", related: ["circulating-supply", "max-supply", "burn"] },
  { term: "TVL", definition: "Total value locked. The dollar value of assets deposited in a protocol. Because it is measured in dollars, it rises and falls with token prices as well as deposits.", related: ["liquidity-pool", "defi"] },
  { term: "Vesting", definition: "A schedule that releases tokens to a team, investors or contributors over time, often with a cliff first. It limits how fast insiders can sell.", related: ["cliff", "token-unlock", "tokenomics"] },
  { term: "Volume", definition: "The total value traded in a period. It can be inflated by wash trading, so read it alongside liquidity and the number of transactions.", related: ["wash-trading", "liquidity"] },
  { term: "Wallet", definition: "Software or hardware that holds your keys and signs transactions. Your coins live on the blockchain, not inside the wallet itself.", related: ["private-key", "seed-phrase", "hot-wallet"] },
  { term: "Wash trading", definition: "Trading with yourself, or between accounts you control, to fake volume and interest. It makes a token look more active than it is.", related: ["volume", "pump-and-dump"] },
  { term: "Whale", definition: "A wallet holding a large amount of a token. In a thin market, its trades can move the price.", related: ["liquidity", "pump-and-dump"] },
  { term: "Wrapped token", definition: "A token that represents another asset on a different chain or in a different format. It is a claim backed by whoever runs the bridge or wrapper, and it can trade at a different price from the original.", related: ["bridge", "smart-contract"] },
  { term: "Yield", definition: "The return earned on deposited or staked assets over a period. A higher yield usually comes with higher risk, so ask where it comes from.", related: ["apy", "staking", "liquidity-pool"] },
];

/** Sort key that ignores case and punctuation so the list reads A to Z. */
const sortKey = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, "");

export const GLOSSARY: GlossaryTerm[] = RAW.map((r) => ({ ...r, slug: slugify(r.term) })).sort((a, b) => sortKey(a.term).localeCompare(sortKey(b.term)));

/** First letter of a term, used for the A to Z rail. */
export function letterOf(term: string): string {
  return term.slice(0, 1).toUpperCase();
}

/** Look up a term by its anchor slug. */
export function termBySlug(slug: string): GlossaryTerm | undefined {
  return GLOSSARY.find((t) => t.slug === slug);
}
