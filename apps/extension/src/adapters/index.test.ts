// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { makeProductView } from '../testing/outcome';
import { ADAPTERS, extractProductView, type RetailerAdapter } from './index';
import { krogerDemoAdapter } from './demo';
import { krogerAdapter } from './kroger';

const STORE = { locationId: 'kroger-1001' };

function adapter(host: string, extract: RetailerAdapter['extract']): RetailerAdapter {
  return { canHandle: (url) => url.hostname === host, extract };
}

describe('extractProductView', () => {
  it('registers only the Kroger adapter and the path-locked fallback adapter', () => {
    expect(ADAPTERS).toEqual([krogerAdapter, krogerDemoAdapter]);
  });

  it('returns null when no adapter handles the URL, without calling any extractor', () => {
    const extract = vi.fn();
    expect(
      extractProductView([adapter('shop.example.test', extract)], document, location, STORE),
    ).toBeNull();
    expect(extract).not.toHaveBeenCalled();
  });

  it('delegates to the adapter that handles the URL and passes the selected store', () => {
    const view = makeProductView();
    const extract = vi.fn(() => view);
    const other = vi.fn();
    const adapters = [adapter('shop.example.test', other), adapter(location.hostname, extract)];

    expect(extractProductView(adapters, document, location, STORE)).toBe(view);
    expect(extract).toHaveBeenCalledWith(document, location, STORE);
    expect(other).not.toHaveBeenCalled();
  });

  it('passes an adapter’s null (incomplete page) straight through', () => {
    expect(
      extractProductView([adapter(location.hostname, () => null)], document, location, STORE),
    ).toBeNull();
  });
});
