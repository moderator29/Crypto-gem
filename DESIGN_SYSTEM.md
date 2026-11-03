# Design system

One visual language for the whole product. Tokens and component classes live in `src/app/globals.css`; React building blocks live in `src/components/ui/`. New pages use these and add no ad hoc styling.

## Principles

- Dark is the identity and the default (even when the visitor's OS prefers light). Light is a finished alternative behind a toggle, from the same tokens.
- Restraint. Glow is reserved for the primary action, focus, and live indicators. Glass blur is used only for floating UI.
- Real data or an honest state. Unavailable data renders as a dash or an explanatory empty state, never an invented number.
- Every visible control works. Informational labels are badges and never look clickable.

## Layers

| Layer | Class | Use |
| --- | --- | --- |
| Canvas | `.aurora` | Page background with restrained ambient light |
| Surface | `.card` | Default panel. Solid layered fill, hairline border, no blur |
| Featured | `.card-lit` | One emphasised panel per view (corner glow, lit edge) |
| Inner tile | `.card-flat` | Quiet tile inside a card |
| Floating | `.glass-float` | Header, drawer, dialogs, menus, toasts, dock. The only blurred surface |

## Tokens

Colour: `--canvas --surface-1..3 --line-1..3 --text --text-soft --text-muted --brand --brand-2 --up --down --warm`. Radius scale `--r-xs..xl`, control heights `--h-sm 36`, `--h-md 44`, `--h-lg 52`. Motion `--dur-1..4` (120, 200, 320, 520 ms) and `--ease-out`. Type classes `.h-display .h1 .h2 .h3 .eyebrow`, font Geist with tabular numerals via `.num`.

## Controls

- Buttons: `btn` (secondary), `btn-primary`, `btn-ghost`, `btn-danger`; sizes `btn-sm`, default, `btn-lg`; `btn-icon` for square icon buttons. Use `<Button>` (adds `loading`) and `<ButtonLink>` (navigation) from `ui/Button`. Never override size or shape with `!` utilities.
- Filters and tabs: `.chip` for toggles, `<LinkTabs>` for views that have their own URL (sliding active pill).
- Labels: `<Badge tone="neutral|brand|up|down|warn|sponsored">`.
- Fields: `.input` (text, select, textarea). Focus ring is the brand colour.

## Page building blocks

`PageHeader` (breadcrumbs, eyebrow, title, one-line purpose, actions), `Breadcrumbs`, `SectionHeader` (with a link to the dedicated page), `EmptyState` (neutral or error, with a next step), `ChainBadge` (accent chip with initials, not an official logo), `Tip`, `Toast` (`useToast`), `TokenLogo` (real logo or monogram).

## Motion

`.page-enter` on every navigation (via `app/template.tsx`), `.stagger` for grids and lists, sliding indicators for the primary nav, dock and tabs (framer-motion layout animations), a price flash on live refresh, a pulsing live dot. `prefers-reduced-motion` disables all of it. The Live Rail uses its own requestAnimationFrame loop (about 26 px/s), pauses on hover, focus, touch, offscreen, hidden tab and by an explicit button, and falls back to a plain scroller.

## Navigation rules

A dedicated section is a page with a URL: Markets (with six views), Chains and chain pages, Search, Token, Promotion, Boost, Add Coin, AI Copilot, Dashboard (six pages), Settings, Payment. Overlays are only for quick search, the mobile menu and confirmations.
