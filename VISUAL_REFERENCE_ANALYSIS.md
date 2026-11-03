# Visual reference analysis

Source: 16 mobile screenshots of cnwhales.cc supplied by the owner (home, explore market, expanded row, vote toasts, footer, drawer, search, boost flow, hosted NOWPayments page, promote page). These are functional references. Nothing is copied: no logo, artwork, wording or exact composition. Crypto Gems keeps its own identity (gem mark, obsidian and aurora palette, glass surfaces).

## What the reference does well

| Area | Observation | Our take |
| --- | --- | --- |
| Header | Compact: logo left, search, menu, language flag right | Keep compact. Add language switcher when i18n lands |
| Ticker | Rank, logo, symbol, boost count, 24h change, a clear end chevron | We already scroll continuously. Add manual prev/next and a measured activity figure instead of a boost count |
| Home hero | One large promoted banner, a second wide banner beneath, then a row of pill shortcuts | Same hierarchy, different composition. Available inventory states instead of fake advertisers |
| Pill shortcuts | Trending, Top Gainers, All Coins, New Listings, Promote, Apply Listing as one horizontal row | Adopt as a quick-nav row |
| Top Trending carousel | Large square logo cards with rank, name, symbol, market cap, chain badge, age; prev/next buttons | Adopt as a snap-scroll carousel with real data |
| Market table | One row per coin: rank, logo with chain badge overlay, name and symbol, price and coloured change, chevron | Adopt. Mobile rows stay two lines, details expand inline |
| Expanded row | Price, chains, 24h change, volume with info tooltip, market cap, launch date | Adopt with real fields. Dash when a value is unavailable |
| Pagination | "596 projects" with numbered pages | Adopt as server-driven pages once listings exist |
| Chain chips | Chips carry real chain logos | Use chain logos where available, monogram otherwise |
| Search | Full-screen on mobile, back arrow, "Suggestion" list, logo, name, symbol pill | Make our search a full-screen sheet on mobile |
| Drawer | Home, Markets, Boost, Promote, Apply Listing, Partnership, green Add Coin button, sun/moon pill | Adopt structure. Theme pill replaces our single toggle |
| Voting | Rocket vote button with count, success toast, 30 minute cooldown error | Community Favourites with a server-enforced cooldown, for listed projects only |
| Boost | Headline, search, "20 projects" list with arrows, then packs with rank ranges and a Max 3 days note, then payment method list grouped by asset | Same journey. Rank ranges are shown as sponsored slot ranges, never as organic rank guarantees |
| Hosted payment page | Payment ID, send deposit, countdown, amount with network tag, address, Show QR, wallet buttons, "Key things to note" | Our page already shows these. Add wallet deposit buttons only where genuinely supported |
| Promote page | Annotated wireframe of the page with the target zone highlighted, recommended size, tier prices with discount percentages, one CTA | Adopt the highlighted placement preview, per placement, using real Crypto Gems components |
| Footer | Brand, company links, social links (ads booking, support, express listing) | Add footer with links that exist |

## Problems visible in the reference that we avoid

- Loading dash and zero values shown as data (24h volume `$0`, launch date `-`). We show an explicit unavailable state.
- Text collision at the right edge of long names and rows (name overlapping logo, truncated ranks). We truncate with ellipsis and keep fixed columns.
- Toast cooldown wording that exposes the rule only after failure. We show the cooldown before the user taps.
- Pricing discounts implied by percentage only. We show original price, discount, savings and final amount.

## Status

| Item | Status |
| --- | --- |
| Pill shortcuts, Top Trending carousel | in progress |
| Expandable market rows with detail panel | in progress |
| Full-screen mobile search | in progress |
| Drawer theme pill and footer | in progress |
| Promote page placement previews | in progress |
| Boost journey (list, packs, payment) | in progress |
| Votes | planned |
