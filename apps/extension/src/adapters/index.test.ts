// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { makeProductView } from '../testing/outcome';
import { ADAPTERS, extractProductView, type RetailerAdapter } from './index';

function adapter(host: string, extract: RetailerAdapter['extract']): RetailerAdapter {
  return { canHandle: (url) => url.hostname === host, extract };
}

describe('extractProductView', () => {
  it('has no registered adapters yet, so no page can produce a comparison', () => {
    expect(ADAPTERS).toHaveLength(0);
    expect(extractProductView(ADAPTERS, document, location)).toBeNull();
  });

  it('returns null when no adapter handles the URL, without calling any extractor', () => {
    const extract = vi.fn();
    expect(extractProductView([adapter('www.cvs.com', extract)], document, location)).toBeNull();
    expect(extract).not.toHaveBeenCalled();
  });

  it('delegates to the adapter that handles the URL', () => {
    const view = makeProductView();
    const extract = vi.fn(() => view);
    const other = vi.fn();
    const adapters = [adapter('www.cvs.com', other), adapter(location.hostname, extract)];

    expect(extractProductView(adapters, document, location)).toBe(view);
    expect(extract).toHaveBeenCalledWith(document, location);
    expect(other).not.toHaveBeenCalled();
  });

  it('passes an adapter’s null (incomplete page) straight through', () => {
    expect(
      extractProductView([adapter(location.hostname, () => null)], document, location),
    ).toBeNull();
  });
});
