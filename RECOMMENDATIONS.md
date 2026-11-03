# Recommendations

Twenty ideas ranked by value to traders and to revenue. Everything here uses real data or the existing payment and auth stack. Nothing needs invented numbers.

## Discovery and data
1. **Price alerts.** Set a level on any token, get an email or push when it crosses. Needs a cron check against provider prices and a table with RLS.
2. **Portfolio view.** Paste or connect a wallet and see holdings with real prices. Read only, non custodial.
3. **Compare tokens.** Pick two or three tokens and overlay their 7 day lines and key stats on one page.
4. **Saved screens.** Save a filter and sort (chain, view, minimum liquidity) as a named screen on the dashboard.
5. **New pair alerts by chain.** Subscribe to fresh pools on one chain above a liquidity floor.
6. **Token risk panel.** Show GoPlus honeypot, tax and ownership flags on every token page, with the source labelled.
7. **Holder and liquidity concentration.** Top holder share and LP lock state from on chain data, clearly dated.
8. **Social proof from verified links only.** Show a project's official site and socials once the listing is verified.

## Interface
9. **Command palette.** Extend the search dialog to jump to pages and actions, not only tokens.
10. **Column picker.** Let users choose which board columns show and remember it.
11. **Compact and comfortable density toggle** for the board.
12. **Pinned watchlist strip** under the header for signed in users.
13. **Live price flash and a visible "updated Ns ago"** on every board.
14. **Share cards.** A generated image of a token's 7 day chart and stats for sharing.
15. **Keyboard navigation** on the board: arrows to move, Enter to open, W to watch.

## Revenue and trust
16. **Boost and ad performance page** for buyers: impressions, clicks and click rate with refunds shown if delivery falls short.
17. **Listing status tracker.** A clear timeline from submitted, paid, reviewed to live.
18. **Verified badge programme** with a public checklist, so the badge means something.
19. **Referral links** for projects that bring listings, paid from fee revenue with an audit trail.
20. **Public status page** for data providers (GeckoTerminal, CoinGecko, payments), so slow data is explained, not guessed.

## Status

Built: 1 price alerts (page, API, checked by the maintenance job, delivers a notification), 3 compare tokens, 6 token security check (GoPlus, EVM chains), 10 mini chart toggle, 11 compact density toggle, 20 data status page, plus a notifications inbox that also reports payment confirmations and listing decisions.

Not built yet: 2 portfolio (needs a wallet data provider key), 4 saved screens, 5 new pair alerts, 7 holder concentration, 8 verified socials, 9 command palette, 12 pinned watchlist strip, 13 update timestamps, 14 share cards, 15 keyboard navigation, 16 buyer performance page, 17 listing timeline, 18 verified badge programme, 19 referrals.
