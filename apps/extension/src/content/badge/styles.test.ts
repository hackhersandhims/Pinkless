import { describe, expect, it } from 'vitest';
import { BADGE_CSS } from './styles';

/** Design-system audit (DESIGN_SYSTEM.md): the badge stylesheet may use tokens only. */
describe('BADGE_CSS', () => {
  it('contains no raw colors', () => {
    expect(BADGE_CSS).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(BADGE_CSS).not.toMatch(/\b(rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\(/i);
  });

  it('every color-bearing declaration uses a var(--…) token or transparent', () => {
    const colorDeclarations = BADGE_CSS.match(
      /(?:^|[\s;{])(?:color|background(?:-color)?|border-color)\s*:\s*[^;]+;/g,
    );
    expect(colorDeclarations?.length).toBeGreaterThan(0);
    for (const declaration of colorDeclarations ?? []) {
      expect(declaration, declaration).toMatch(/var\(--[a-z0-9-]+\)|transparent/);
    }
  });

  it('every var() reference is a token that exists in tokens.css', async () => {
    const { TOKENS_CSS } = await import('../tokens');
    const declared = new Set([...TOKENS_CSS.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
    const used = new Set([...BADGE_CSS.matchAll(/var\((--[a-z0-9-]+)\)/g)].map((m) => m[1]));
    expect(used.size).toBeGreaterThan(0);
    for (const name of used) expect(declared.has(name!), name).toBe(true);
  });

  it('sets no font sizes or families of its own; typography comes from the type classes', () => {
    expect(BADGE_CSS).not.toMatch(/font-size|font-family|line-height|font-weight/);
  });

  it('spaces things only with spacing tokens', () => {
    const lengths = BADGE_CSS.match(/(?:padding|margin|gap)[a-z-]*\s*:\s*[^;]+;/g) ?? [];
    for (const declaration of lengths) {
      if (/:\s*0\s*;/.test(declaration)) continue;
      expect(declaration, declaration).not.toMatch(/\d+(px|rem|em)/);
    }
  });

  it('never hides the keyboard focus indicator', () => {
    expect(BADGE_CSS).toMatch(/:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--ink\)/);
    expect(BADGE_CSS).not.toMatch(/outline:\s*(none|0)\b/);
  });

  it('places the comparison on the page’s right edge', () => {
    expect(BADGE_CSS).toMatch(/inset-inline-end:\s*var\(--space-4\)/);
    expect(BADGE_CSS).not.toMatch(/inset-inline-start:/);
  });
});
