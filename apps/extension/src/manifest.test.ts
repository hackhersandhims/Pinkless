import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

type Manifest = {
  permissions?: string[];
  host_permissions?: string[];
  content_scripts?: Array<{ matches: string[] }>;
  web_accessible_resources?: Array<{ matches: string[] }>;
};

async function manifest(): Promise<{ raw: string; json: Manifest }> {
  const raw = await readFile(new URL('../public/manifest.json', import.meta.url), 'utf8');
  return { raw, json: JSON.parse(raw) as Manifest };
}

describe('manifest scope', () => {
  it('declares no retailer other than Kroger', async () => {
    const { raw } = await manifest();
    expect(raw).not.toMatch(/cvs|walmart/i);
  });

  it('runs the content script only on www.kroger.com and the fixed fallback route', async () => {
    const { json } = await manifest();
    const matches = (json.content_scripts ?? []).flatMap((script) => script.matches);
    expect(matches).toEqual(['https://www.kroger.com/*', 'http://localhost:4174/product/kroger*']);
  });

  it('never uses a broad wildcard host or all-URLs permission', async () => {
    const { json } = await manifest();
    const patterns = [
      ...(json.host_permissions ?? []),
      ...(json.content_scripts ?? []).flatMap((script) => script.matches),
      ...(json.web_accessible_resources ?? []).flatMap((resource) => resource.matches),
    ];
    for (const pattern of patterns) {
      expect(pattern).not.toBe('<all_urls>');
      expect(new URL(pattern.replace('*', 'x')).hostname, pattern).not.toContain('*');
      expect(pattern, pattern).not.toMatch(/^\*:|:\/\/\*/);
    }
    expect(json.permissions).toEqual(['storage', 'sidePanel']);
  });

  it('can reach only the Pinkless API', async () => {
    const { json } = await manifest();
    expect(json.host_permissions).toEqual(['https://pinkless-marketplace.vercel.app/*']);
  });
});
