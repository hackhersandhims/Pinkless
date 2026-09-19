# Pinkless Design Tokens

The design system is centralized in this package.

```text
packages/tokens/
  tokens.json                 source of truth
  tokens.css                  CSS representation consumed by app UI
  assets/pinkless-lockup.png  the logo (a single flattened image)
```

## Source of truth

`tokens.json` is the canonical source of truth. `tokens.css` is the CSS representation consumed by
application UI.

If token values change in `tokens.json`, update `tokens.css` to match, then run:

```bash
pnpm run tokens:sync    # regenerates apps/extension/src/content/tokens.ts from tokens.css
pnpm run tokens:check   # fails if json, css, and the extension copy disagree
```
```

`tokens:check` runs as part of `pnpm run build` and in CI. It also fails if `tokens.css` declares a
token that `tokens.json` does not, so a token cannot be added on one side only.

`tokens.css` and `tokens.json` are kept verbatim from the design system. They are listed in
`.prettierignore` so a formatter cannot rewrite them.

## Colors

| Token           | Value           | Use                                                                                     |
| --------------- | --------------- | --------------------------------------------------------------------------------------- |
| `surface-100`   | `#f3ede1`       | Main cream page ground. Neutral cards. Light sections.                                  |
| `surface-pink`  | `#f28fc0`       | Hero areas. Awareness/problem-oriented content. Important branded surfaces.             |
| `surface-900`   | `#7a1a46`       | Deep plum surface. Insight/payoff sections. Strong-contrast areas.                      |
| `ink`           | `{surface-900}` | Standard text on light and pink surfaces.                                               |
| `on-dark`       | `{surface-100}` | Main text on `surface-900`.                                                             |
| `on-dark-muted` | `#f2a9cc`       | Secondary text and section labels on `surface-900`.                                     |
| `border`        | `#c2607e`       | Dividers, card outlines, and controls that need a visible boundary. Added for function. |

Do not use color as the only carrier of meaning; pair it with text, shape, or an icon.

## Typography

Use the semantic classes: `.display`, `.heading`, `.body`, `.caption`, `.label`.

New marketplace UI should prefer these classes over inventing arbitrary font sizes and weights. All
five use `--font-sans` (a system stack).

## Spacing

Use `--space-2` (8px), `--space-3` (12px), `--space-4` (16px), `--space-6` (24px). Prefer these before
introducing component-specific spacing.

## Radius

Use `--radius-sm` (6px), `--radius-md` (10px), `--radius-lg` (16px).

## How each app loads the tokens

**Marketplace** imports `tokens.css` once, globally, in `apps/marketplace/src/main.tsx`. Do not
import it again per component.

**Extension** cannot do that. The badge renders in a Shadow DOM, which inherits nothing from the
retailer page, so the full CSS is injected into the shadow root's own `<style>`:

- `apps/extension/src/content/tokens.ts` exports `TOKENS_CSS`. It is generated from `tokens.css`
  (the extension's plain `tsc` build cannot `import '…?raw'`). Never edit it by hand.
- `apps/extension/src/content/shadow-root.ts` exports `mountBadgeRoot()`, which injects that CSS as
  the first child of the shadow root and returns a `container`.

> **Render all badge markup inside `container`.** `tokens.css` declares its variables on
> `:root, [data-theme="light"]`, and `:root` never matches inside a shadow tree. The variables only
> exist on and below an element with `data-theme="light"`, which `container` carries. Markup
> appended to the shadow root directly gets no `var(--…)` values (verified in Chrome). The
> `.display`/`.body`/… classes still apply, since they do not depend on variables.

## Rules

1. New Pinkless UI must use design tokens.
2. Do not introduce raw hexadecimal colors inside app UI.
3. Do not invent an unspecified primary/CTA color.
4. If a design requires a missing semantic token, flag the need instead of silently inventing a
   brand color.
5. Keep token JSON and CSS synchronized (`pnpm run tokens:check`).

## Logo

`assets/pinkless-lockup.png` is a single flattened image: pink star mark, cursive "pinkless"
wordmark, tagline, on a near-black ground. Reference the file. Do not recreate it in CSS, redraw
it, re-type the wordmark as text, or rebuild individual layers.

## Open questions

These are intentionally unresolved. Flag them; do not silently "fix" them.

**A. Logo typography.** The logo's wordmark is a cursive script that differs from the sans-serif UI
typography. It is unconfirmed whether the script is logo-only or Pinkless has a second brand/display
typeface. Do not introduce a script font into the application until design confirms it.

**B. Dark surface.** The flattened logo sits on a near-black ground, while `surface-900` is deep
plum. It is unconfirmed whether these are two intentionally separate dark surfaces or should become
one color. Do not silently normalize them.

**C. CTA color.** No primary CTA/button color is defined. Do not invent one. Ask before establishing
a new global CTA token. (The marketplace's one filled button reuses `surface-900` on `on-dark` and is
marked as a placeholder in its CSS.)
