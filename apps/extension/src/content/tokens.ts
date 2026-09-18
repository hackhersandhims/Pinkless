// GENERATED from packages/tokens/tokens.css by scripts/tokens.mjs. Do not edit by hand.
// Run `pnpm run tokens:sync` after changing the tokens; `pnpm run tokens:check` fails on drift.
//
// The badge renders in a Shadow DOM and cannot inherit page CSS, so this string is injected
// into the shadow root's own <style> (see ./shadow-root.ts). If the extension moves to a
// bundler, replace this file with `import TOKENS_CSS from '<path>/tokens.css?raw'`.
export const TOKENS_CSS = `:root,
[data-theme="light"] {
  --surface-100: #f3ede1;
  --surface-pink: #f28fc0;
  --surface-900: #7a1a46;
  --ink: var(--surface-900);
  --on-dark: var(--surface-100);
  --on-dark-muted: #f2a9cc;
  --border: #c2607e;

  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;

  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
}

.display { font-family: var(--font-sans); font-size: 32px; line-height: 40px; font-weight: 700; }
.heading { font-family: var(--font-sans); font-size: 20px; line-height: 28px; font-weight: 600; }
.body    { font-family: var(--font-sans); font-size: 15px; line-height: 22px; font-weight: 400; }
.caption { font-family: var(--font-sans); font-size: 13px; line-height: 18px; font-weight: 400; }
.label   { font-family: var(--font-sans); font-size: 12px; line-height: 16px; font-weight: 600; letter-spacing: 0.02em; }
`;
