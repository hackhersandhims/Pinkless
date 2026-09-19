# Pinkless Design System

## Canonical location

Design tokens live in `packages/tokens/`:

- `tokens.json` is the source of truth.
- `tokens.css` is generated/hand-derived from the JSON and must be updated whenever the JSON values
  change.
- `assets/pinkless-lockup.png` is the logo lockup.

Full documentation, including semantic color usage, is in `packages/tokens/README.md`.

After changing tokens, run `pnpm run tokens:sync` (regenerates the extension's copy), then
`pnpm run tokens:check`. The check runs in `pnpm run build` and CI and fails if `tokens.json`,
`tokens.css`, and `apps/extension/src/content/tokens.ts` disagree.

## Mandatory usage

Any new Pinkless UI must use design tokens.

Never use raw hex values (or `rgb()`/`hsl()`) in application UI when an appropriate token exists. Do
not introduce new brand colors ad hoc. If a design needs a semantic token that is missing, flag it
instead of inventing one.

## Typography

Use the semantic classes: `.display`, `.heading`, `.body`, `.caption`, `.label`. Do not invent font
sizes or weights.

## How the apps consume tokens

- **Marketplace:** `packages/tokens/tokens.css` is imported once, globally, in
  `apps/marketplace/src/main.tsx`. Do not re-import it per component.
- **Extension badge:** it renders in a Shadow DOM and cannot inherit page CSS.
  `apps/extension/src/content/tokens.ts` (generated) exports the full CSS as `TOKENS_CSS`, and
  `mountBadgeRoot()` in `apps/extension/src/content/shadow-root.ts` injects it into the shadow
  root's own `<style>` before any component CSS. Never link a stylesheet into the shadow root or
  rely on variables defined on the page.

**Render all badge markup inside the `container` that `mountBadgeRoot()` returns.** The token
variables are declared on `:root, [data-theme="light"]`; `:root` never matches inside a shadow tree,
so the variables exist only on and below an element with `data-theme="light"`, which the container
carries. Markup appended to the shadow root directly gets no `var(--…)` values.

If the extension moves to a bundler, replace the generated `tokens.ts` with
`import TOKENS_CSS from '…/tokens.css?raw'` and drop the `tokens:sync` step.

## Open questions

Two questions are inherited from design and unresolved. Flag them before "fixing" either silently.

1. The logo's wordmark uses a cursive script font distinct from the bold sans used everywhere else.
   It is unconfirmed whether this is logo-only or a second brand typeface. Do not add a script font
   to the app until design confirms.
2. The logo sits on a near-black ground, while `surface-900` (the deep plum panel color) is a
   different dark. It is unconfirmed whether these are meant to be the same dark or two separate
   ones. Do not normalize them.

## CTA

No primary/CTA button color is defined. Do not invent one. Ask or flag the need before introducing a
new global CTA token. (`tokens:check` fails if a token appears in `tokens.css` without being in
`tokens.json`.)
