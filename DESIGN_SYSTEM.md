# Design system

Design tokens live in `packages/tokens/`:

- `tokens.json` is the source of truth.
- `tokens.css` is compiled/hand-derived from it — regenerate `tokens.css` (and
  the inlined copy at `apps/extension/src/content/tokens.ts`) if `tokens.json`
  changes.
- `assets/pinkless-lockup.png` is the logo lockup.

Any new UI must use the tokens (CSS variables and `.display` / `.heading` /
`.body` / `.caption` / `.label` classes), never a raw hex value or hardcoded
font size.

- `apps/marketplace` imports `packages/tokens/tokens.css` once, globally, in
  `src/main.tsx`.
- `apps/extension`'s badge renders inside a Shadow DOM and cannot inherit
  page-level CSS, so `apps/extension/src/content/tokens.ts` exports the full
  tokens.css contents as a string (`TOKENS_CSS`) to be inlined into the shadow
  root's `<style>` tag on mount. See `getBadgeShadowRoot()` in
  `apps/extension/src/content/index.ts`.

## Open questions — do not silently resolve

Two questions are inherited from design and unresolved. Flag them before
"fixing" either silently:

1. The logo's wordmark uses a cursive script font distinct from the bold sans
   used everywhere else. Unconfirmed whether that's logo-only or a second
   brand typeface.
2. The logo sits on a near-black ground, while `--surface-900` (the deck's
   dark panel color) is a deep plum. Unconfirmed whether these are meant to be
   the same dark or two separate ones.

No primary/CTA button color is defined yet. Don't invent one — ask.
