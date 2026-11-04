# 100 upgrades

Every item is either built (marked `[x]`) or listed as open work (`[ ]`). Front end first, then back end. `ME` is the lead session, `AG` is the second worker. Nothing here uses invented market data.

## A. Motion and animation (1 to 18)
1. [x] Count-up numbers that tick when they scroll into view (`CountUp`)
2. [x] Scroll reveal with stagger on every major section (`Reveal`)
3. [x] 3D hover tilt on trending and pack cards (`Tilt`)
4. [x] Cursor-follow spotlight glow on cards (`Spotlight`)
5. [x] Top route progress bar on navigation (`RouteProgress`)
6. [x] Confetti burst on payment confirmed and listing live (`Confetti`)
7. [x] Animated aurora mesh behind the home hero
8. [x] Button sheen sweep on primary buttons
9. [ ] Animated gradient border on featured cards
10. [ ] Price flash and tick on live rows (exists) plus arrow bounce on direction change
11. [ ] Sparkline draw-in (exists) plus hover scrub readout
12. [x] Spring tab indicators everywhere (nav exists) including market tabs
13. [x] Skeleton shimmer for every loading state
14. [x] Dialog and sheet enter and exit animations
15. [x] Staggered list entrance on every table
16. [x] Pulse ring on live and status dots
17. [x] Floating gem logo with idle motion in empty states
18. [x] Reduced-motion fallback for all of the above

## B. Sound and haptics (19 to 24)
19. [x] Synthesised UI sound engine (no audio files, WebAudio)
20. [x] Sounds: click, success, error, notify, whoosh, coin
21. [x] Sound toggle in header and Settings, off by default
22. [x] Sound volume slider
23. [x] Haptic taps on supported phones
24. [x] Success chime on payment confirmed

## C. Containers, surfaces, graphics (25 to 36)
25. [x] `Dialog` component with focus trap
26. [x] `Sheet` bottom sheet for mobile actions
27. [x] `Stat` tile with trend arrow and sparkline
28. [x] `Meter` and `Progress` bars with animated fill
29. [x] `Avatar` with gradient fallback from a string
30. [x] `Stepper` for multi-step flows
31. [ ] Glass panel variant with noise texture
32. [x] Gradient mesh card backgrounds per chain colour
33. [ ] Illustrated empty states (SVG, animated)
34. [x] Branded 404 and error pages with motion
35. [ ] Animated section dividers
36. [ ] Dark and light parity audit on every container

## D. Home (37 to 46)
37. [x] Hero stats strip with count-up (24h volume, pools sampled, new pairs, chains)
38. [x] Fear and Greed gauge (alternative.me)
39. [x] Chain dominance donut from sampled volume
40. [x] Top gainers and losers mini panels
41. [x] Trending searches (from recent searches, local)
42. [x] "What is moving" one-line market narrative from measured data
43. [ ] Quick actions row with animated icons
44. [x] Tilt cards for Top Trending
45. [x] Live ticker with direction arrows
46. [x] Back-to-top button with progress ring

## E. Markets and token page (47 to 60)
47. [x] Token page header with price flash, age, holders if known
48. [x] Key stats grid with count-up
49. [x] Buy panel with live quote (see F)
50. [x] Chart range memory per user
51. [ ] Pools table with DEX logos and liquidity bars
52. [x] Transactions buy/sell pressure bar
53. [x] Price change strip (5m, 1h, 6h, 24h) as coloured chips
54. [x] Similar tokens row
55. [ ] Links block (website, X, Telegram) from detection
56. [x] Contract copy with explorer and scan links
57. [ ] Risk gauge combining market and security signals
58. [ ] Share card image generation
59. [x] Keyboard shortcuts overlay (`?`)
60. [x] Recently viewed tokens drawer

## F. Buying a coin, non-custodial (61 to 66)
61. [x] Buy panel on token pages with amount presets
62. [x] Live Solana quote from Jupiter with price impact and route
63. [x] EVM routes opened in Uniswap, PancakeSwap and Aerodrome with the token prefilled
64. [x] Slippage and fee explainer
65. [x] Wallet-signed only. No custody, no keys, no pooled funds
66. [ ] Buy history link to explorer (no server storage)

## G. Boost, Promotion, Listing (67 to 74)
67. [x] Boost pack comparison table
68. [ ] Boost countdown ring on running boosts
69. [ ] Banner creative checker (size, weight, safe area)
70. [ ] Live banner preview inside the page mock
71. [ ] Listing progress tracker timeline
72. [x] Express Listing confidence meter per detected field
73. [x] Package comparison with animated highlight
74. [x] Order receipt page with confetti

## H. Account and dashboard (75 to 82)
75. [x] Dashboard overview with animated stat tiles
76. [x] Activity timeline
77. [ ] Watchlist grid and list toggle
78. [x] Alert creation sheet from any token row
79. [x] Profile completeness meter
80. [ ] Sign-in methods card with animated link/unlink
81. [x] Notification bell with unread count and ring
82. [ ] Data export (watchlist as CSV)

## I. Tools and learning pages (83 to 92)
83. [x] `/tools` hub
84. [x] Profit and loss calculator
85. [x] Position size and risk calculator
86. [x] DCA calculator
87. [x] Market cap what-if calculator
88. [x] Percent change and break-even calculator
89. [x] `/learn` glossary and guides (rug pulls, liquidity, slippage, FDV)
90. [x] `/help` FAQ with search
91. [x] `/changelog`
92. [x] `/contact` with form validation

## J. Platform, back end, quality (93 to 100)
93. [x] Command palette (Ctrl K) with page jumps
94. [x] Keyboard navigation on boards
95. [x] PWA manifest and install prompt
96. [x] Open Graph images per token
97. [x] Sitemap and robots including tokens
98. [x] Structured data (JSON-LD) on token pages
99. [x] Error boundary per route with retry
100. [ ] Accessibility sweep (axe) and performance budget check
