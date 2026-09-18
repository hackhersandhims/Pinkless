---
name: frontend-craft
description: Use when writing or reviewing UI code in apps/marketplace (React) or the extension's popup/badge — component structure, styling, and accessibility conventions.
---

# Frontend craft

Applies to `apps/marketplace/**` (React + Vite) and `apps/extension/src/popup/**` /
`apps/extension/src/content/**` (popup UI and the in-page badge).

## Styling: tokens only

- Design tokens live in `packages/tokens/` (`tokens.json` is source of truth,
  `tokens.css` is the compiled CSS). See `DESIGN_SYSTEM.md` at the repo root.
- Always style with the CSS variables (`var(--surface-pink)`, `var(--ink)`,
  `var(--space-4)`, `var(--radius-md)`, etc.) and the type classes
  (`.display`, `.heading`, `.body`, `.caption`, `.label`).
- **Never** write a raw hex value, a magic font-size/line-height number, or a
  hardcoded spacing value in component code or CSS. If a value you need
  doesn't exist as a token, stop and ask — don't invent one (this repo has an
  explicit open question about primary/CTA color; don't silently resolve it).
- `apps/marketplace/src/main.tsx` imports `packages/tokens/tokens.css` once,
  globally. Don't re-import it per-component.

## Shadow DOM styling (extension badge)

- The badge renders inside a Shadow DOM root and cannot inherit page-level or
  extension-level CSS (REQUIREMENTS §3/§6).
- Never link an external stylesheet into the shadow root. Inject the tokens by
  inlining `TOKENS_CSS` from `apps/extension/src/content/tokens.ts` into the
  shadow root's own `<style>` tag — see `getBadgeShadowRoot()` in
  `apps/extension/src/content/index.ts` for the existing helper.
- If `packages/tokens/tokens.css` changes, `apps/extension/src/content/tokens.ts`
  must be regenerated to match (it's a hand-inlined copy, not an import).

## Accessibility bar (REQUIREMENTS §6)

These are hard requirements, not nice-to-haves, for every badge/popup control:

- All controls must work with keyboard alone (tab to it, activate with
  Enter/Space) and have descriptive accessible labels — no icon-only buttons
  without an `aria-label`.
- Do not use an assertive ARIA live region for the badge or its content.
- Do not steal focus when the badge mounts, updates, or re-renders.
- Never render the badge so it obscures a price, a checkout control, or any
  native accessibility element on the host page.
- The badge's primary action ("See alternative") opens the outbound URL in a
  new tab; it must not navigate the host page away.

## Component conventions

- Keep the Marketplace static: no client-side price fetching, no login, no
  backend calls (REQUIREMENTS §3).
- Badge and popup copy should match the exact strings in REQUIREMENTS §6
  (headline `Comparable alternative: save $X.XX`, actions `See alternative` /
  `Why this was matched` / `Not now`) rather than paraphrasing them per
  component.
