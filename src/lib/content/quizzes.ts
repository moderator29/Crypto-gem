export interface QuizQuestion {
  q: string;
  options: string[];
  /** Index of the correct option. */
  answer: number;
  /** Shown after the person answers, whether they were right or wrong. */
  why: string;
}

export interface Quiz { slug: string; questions: QuizQuestion[] }

/** Four-question checks for the guides. Each question restates something the guide actually says. */
export const QUIZZES: Quiz[] = [
  {
    slug: "what-is-a-rug-pull",
    questions: [
      {
        q: "What happens in a liquidity pull?",
        options: ["The token price is paused by the exchange", "The creator withdraws the main asset from the trading pool so holders cannot sell at a fair price", "Holders are refunded from the pool", "The contract burns half the supply"],
        answer: 1,
        why: "The creator pairs the token with a small amount of a major asset, then removes that asset. Without it, there is nothing to trade the token against, so the price collapses.",
      },
      {
        q: "Which holder pattern is a warning sign?",
        options: ["Thousands of wallets holding small amounts", "A few non-pool wallets holding a large share of supply", "The largest holder being the trading pool", "Holders spread across several chains"],
        answer: 1,
        why: "If a handful of wallets control a big share, one sale can crash the price. The pool itself holding a lot is normal.",
      },
      {
        q: "A project says its liquidity is locked, but the lock ends next week. How much comfort should that give?",
        options: ["Full comfort, a lock is a lock", "Very little, because protection ends when the lock does", "None, locks are always fake", "It only matters for tokens older than a year"],
        answer: 1,
        why: "A lock only protects you for as long as it lasts. Check both whether liquidity is locked and for how long, and also how much liquidity there is.",
      },
      {
        q: "You suspect a token is a rug pull and you hold some. What is a sensible step?",
        options: ["Buy more to lower your average price", "Revoke any allowance you gave it and do not add to the position", "Wait for the team to announce a fix and do nothing", "Send tokens to the contract to prove you are a holder"],
        answer: 1,
        why: "Do not average down into a failing token. Revoking an allowance stops the contract spending more of your tokens, and reporting the token warns others.",
      },
    ],
  },
  {
    slug: "liquidity-and-why-it-matters",
    questions: [
      {
        q: "What does liquidity mainly decide?",
        options: ["How popular the token is on social media", "How much you can buy or sell without moving the price much", "Who owns the contract", "How many decimals the token has"],
        answer: 1,
        why: "Trades happen against a pool. The deeper the pool, the smaller the ripple a given trade makes in the price.",
      },
      {
        q: "A token shows a ten million dollar market cap, but its pool holds twenty thousand dollars. What does this tell you?",
        options: ["The token is very safe to sell", "You cannot realistically sell that much value into the pool, so the market cap overstates what you could get", "The pool must be locked", "The market cap is wrong and should be zero"],
        answer: 1,
        why: "Market cap is price times supply, and the price came from tiny trades. Compare it with liquidity before trusting it.",
      },
      {
        q: "As a rule of thumb, when should you expect meaningful price impact?",
        options: ["When the trade is more than about one percent of the pool", "Only when the trade is larger than the whole pool", "Never on a decentralised exchange", "Only for trades above ten thousand dollars"],
        answer: 0,
        why: "Around one percent of the pool is a handy warning level. It depends on pool size, not a fixed dollar amount.",
      },
      {
        q: "Why does it matter if one wallet supplied nearly all of a pool's liquidity?",
        options: ["It lowers trading fees", "That wallet can withdraw nearly all of it", "It makes the token verified", "It increases circulating supply"],
        answer: 1,
        why: "Whoever provided the liquidity can usually take it back out. Concentrated liquidity is a risk, especially if it is not locked.",
      },
    ],
  },
  {
    slug: "slippage-and-price-impact",
    questions: [
      {
        q: "What is price impact?",
        options: ["How much your own trade moves the pool, which you can see before you trade", "The fee the network charges", "The difference caused by other people's trades after you click", "The tax built into a token"],
        answer: 0,
        why: "Impact depends on your size compared with the pool. Slippage is the separate difference between the quoted price and the price you actually get.",
      },
      {
        q: "What is the risk of setting maximum slippage too tight?",
        options: ["You always get a better price", "Transactions may fail and you still pay network fees", "Bots cannot see your trade", "Your tokens are locked"],
        answer: 1,
        why: "If the price moves past your limit, the transaction reverts rather than fill. A revert wastes the fee. Too loose a setting has the opposite problem and invites bots.",
      },
      {
        q: "A token has a built-in sell tax. How should your slippage setting relate to the tax?",
        options: ["It must be below the tax", "It must exceed the tax, or every trade fails", "It is unrelated to the tax", "It should always be set to zero"],
        answer: 1,
        why: "The tax reduces what you receive, which counts against your limit. If your setting is smaller than the tax, the trade can never meet it.",
      },
      {
        q: "Which of these reduces price impact?",
        options: ["Trading a larger amount at once", "Splitting the order or using a deeper pool", "Raising the slippage setting", "Trading only at night"],
        answer: 1,
        why: "Impact comes from your size relative to the pool. Trade smaller, split the order, or find a pool with more liquidity.",
      },
    ],
  },
  {
    slug: "market-cap-vs-fdv",
    questions: [
      {
        q: "How is market cap calculated?",
        options: ["Price times maximum supply", "Price times circulating supply", "Volume times price", "Liquidity times two"],
        answer: 1,
        why: "Market cap uses the supply that can be traded today. FDV is the one that uses maximum supply.",
      },
      {
        q: "Only a tenth of a token's supply is circulating. How do market cap and FDV compare?",
        options: ["They are equal", "Market cap is about a tenth of FDV", "Market cap is ten times FDV", "They cannot be compared"],
        answer: 1,
        why: "Both multiply the same price by a supply figure, so a tenth of the supply gives a tenth of the value.",
      },
      {
        q: "Why does a large gap between FDV and market cap matter?",
        options: ["It means the token is already fully distributed", "Future unlocks add supply, which can pressure the price unless demand grows as fast", "It lowers the token's fees", "It proves the project is safe"],
        answer: 1,
        why: "A big gap means most tokens are still to come. Each release adds supply, so price faces pressure unless demand keeps up.",
      },
      {
        q: "Which number is better for comparing two projects on equal footing?",
        options: ["FDV", "24 hour volume", "Number of holders", "Token symbol length"],
        answer: 0,
        why: "FDV values every project as if all its tokens existed, so projects with different release schedules are compared fairly. Remember some tokens have no maximum supply.",
      },
    ],
  },
  {
    slug: "what-is-a-honeypot",
    questions: [
      {
        q: "What is a honeypot token?",
        options: ["A token that pays you interest", "A token you can buy but cannot sell, or can only sell at a punishing cost", "A token held only by exchanges", "A token with no creator"],
        answer: 1,
        why: "The contract is written so regular holders cannot cash out while the creator can. Buys keep succeeding, which makes the chart look healthy.",
      },
      {
        q: "Which chart pattern is a warning sign?",
        options: ["Many buys and almost no sells", "Balanced buys and sells", "Steady volume over weeks", "A small price move on large volume"],
        answer: 0,
        why: "If people are buying but nobody can sell, sells will be missing. A heavy one-sided chart deserves a closer look.",
      },
      {
        q: "What is a good habit before committing real size?",
        options: ["Skip checks if the chart looks good", "Run a security scan and try a very small test buy and sell", "Buy a lot to move the price up", "Ask the token's chat whether it is safe"],
        answer: 1,
        why: "Scans simulate a sell and read the code, and a tiny test trade shows what actually happens. Some traps only trigger later, so neither is a guarantee.",
      },
      {
        q: "Why can a clean scan still be wrong?",
        options: ["Scanners only work on weekdays", "Scanners read known patterns, and a new trick or an upgradeable contract may pass today and trap you later", "Scans are paid for by scammers", "A clean scan means the token has no liquidity"],
        answer: 1,
        why: "A scan lowers risk but cannot remove it. Contracts that can be upgraded or use new tricks can change after you check.",
      },
    ],
  },
  {
    slug: "token-allowances-and-revoking",
    questions: [
      {
        q: "What does a token approval do?",
        options: ["Sends your tokens to the app immediately", "Gives a contract permission to move your tokens up to some amount", "Verifies your identity", "Burns the token"],
        answer: 1,
        why: "An approval is a permission, not a transfer. The contract can spend up to the approved amount whenever it likes until you cancel it.",
      },
      {
        q: "Why is an unlimited approval risky?",
        options: ["It costs more to sign", "If the approved contract is later exploited or turns out to be malicious, it can spend your tokens without asking again", "It locks your wallet", "It expires after one trade"],
        answer: 1,
        why: "The approval stays active. A drain can happen even though you never signed a transfer.",
      },
      {
        q: "What does revoking an approval do?",
        options: ["It returns tokens that were already taken", "It stops future spending but does not undo what already happened", "It deletes your wallet", "It is free and happens off-chain"],
        answer: 1,
        why: "Revoking closes the permission going forward. It is an on-chain transaction, so it costs a small network fee.",
      },
      {
        q: "Which approvals should you review first?",
        options: ["The newest ones", "Old approvals for sites you no longer use, and those with the most value at risk", "Only approvals for stablecoins", "None, they clear themselves"],
        answer: 1,
        why: "Sort by value at risk and age. Forgotten approvals for apps you no longer use are the easiest to remove and a common source of loss.",
      },
    ],
  },
  {
    slug: "mev-and-sandwich-attacks",
    questions: [
      {
        q: "In a sandwich attack, what does the bot do?",
        options: ["Buys before your swap and sells right after it", "Blocks your transaction forever", "Steals your seed phrase", "Cancels your approval"],
        answer: 0,
        why: "The bot pushes the price up before your swap executes, you fill at a worse price, then it sells and keeps the difference.",
      },
      {
        q: "What makes a sandwich easier for a bot?",
        options: ["A very tight slippage setting", "A generous slippage allowance", "A hardware wallet", "Trading on a deep pool"],
        answer: 1,
        why: "A loose limit gives the bot room to move the price before your trade would revert.",
      },
      {
        q: "Which of these helps blunt the attack?",
        options: ["Sending the transaction through a protected route that bots cannot see in the open", "Raising slippage to the maximum", "Waiting until the pool is thin", "Splitting nothing and trading everything at once"],
        answer: 0,
        why: "Private submission keeps the trade out of the public pending pool. Tighter slippage on liquid tokens and deeper pools also reduce what can be extracted.",
      },
      {
        q: "How might you notice you were sandwiched?",
        options: ["The wallet sends an email", "A block explorer shows a buy just before and a sell just after your trade from the same address, and your fill was worse than the quote", "Your balance doubles", "The token is delisted"],
        answer: 1,
        why: "The pattern of buy, your trade, sell, from one address, together with a worse fill, is the signature of a sandwich.",
      },
    ],
  },
  {
    slug: "wallet-hygiene",
    questions: [
      {
        q: "Who may legitimately ask for your seed phrase?",
        options: ["Exchange support", "A project's team during an airdrop", "Nobody", "A wallet app, once a year"],
        answer: 2,
        why: "No support team, exchange or project will ever need it. Anyone asking is trying to take your funds.",
      },
      {
        q: "Why keep a second, lightly funded wallet for new apps?",
        options: ["It lowers fees", "If it is compromised, the damage stays small", "It earns interest", "It is required by the apps"],
        answer: 1,
        why: "Keep long-term holdings in a wallet that rarely connects to anything, and use the second one for experiments.",
      },
      {
        q: "Which signing requests deserve extra suspicion?",
        options: ["Approvals, permits and setApprovalForAll", "Plain balance checks", "Viewing your address", "Switching theme"],
        answer: 0,
        why: "These grant spending rights. Some look like harmless logins but give an app permission to move your assets.",
      },
      {
        q: "How often should you review and revoke old approvals?",
        options: ["Never", "Every month or so", "Only after a loss", "Once every five years"],
        answer: 1,
        why: "Regular maintenance catches forgotten permissions before they are abused. Checking after a problem is too late.",
      },
    ],
  },
];

/** The quiz for an article, if it has one. */
export function quizBySlug(slug: string): Quiz | undefined {
  return QUIZZES.find((q) => q.slug === slug);
}
