import { describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { App } from '../App.js';
import { loadComparisons } from '../lib/api.js';
import { getActiveComparisons, groupByCategory } from '../lib/catalog.js';

/**
 * App owns its own BrowserRouter internally, so tests drive navigation via
 * window.history rather than wrapping in a MemoryRouter (which would be
 * shadowed by App's inner router).
 */
function renderAppAt(path: string) {
  window.history.pushState({}, '', path);
  return render(<App />);
}

function compareLinks() {
  return screen
    .getAllByRole('link')
    .filter((link) => (link.getAttribute('href') ?? '').startsWith('/compare/'));
}

async function waitForFeed() {
  await waitFor(() => {
    expect(
      screen
        .queryAllByRole('link')
        .some((link) => (link.getAttribute('href') ?? '').startsWith('/compare/')),
    ).toBe(true);
  });
}

describe('App routing', () => {
  it('renders every active comparison exactly once on "/" (REQUIREMENTS §8)', async () => {
    const expected = getActiveComparisons(await loadComparisons());
    expect(expected.length).toBeGreaterThan(0);

    renderAppAt('/');
    await waitForFeed();

    const hrefs = compareLinks().map((link) => link.getAttribute('href'));

    // Exactly once: one link per active comparison, no duplicates, no extras.
    expect(hrefs).toHaveLength(expected.length);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(new Set(hrefs)).toEqual(new Set(expected.map((item) => `/compare/${item.id}`)));
  });

  it('groups the home feed by category in the fixed order', async () => {
    const groups = groupByCategory(getActiveComparisons(await loadComparisons()));

    renderAppAt('/');
    await waitForFeed();

    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(groups.map((group) => group.label));
  });

  it('renders only that category on /category/:slug', async () => {
    const groups = groupByCategory(getActiveComparisons(await loadComparisons()));
    const razors = groups.find((group) => group.slug === 'razors');
    expect(razors).toBeDefined();

    renderAppAt('/category/razors');
    await waitForFeed();

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Razors');
    expect(compareLinks()).toHaveLength(razors!.items.length);
  });

  it('renders a real comparison on /compare/:id with both retailers and the outbound link', async () => {
    const [item] = getActiveComparisons(await loadComparisons());
    expect(item).toBeDefined();

    renderAppAt(`/compare/${item!.id}`);

    const cta = await screen.findByRole('link', { name: /see alternative/i });
    expect(cta).toHaveAttribute('href', item!.alternative.url);
    expect(cta).toHaveAttribute('target', '_blank');
    expect(cta.getAttribute('rel') ?? '').toContain('noopener');

    // §8: the source retailer for each displayed offer must be identifiable.
    const main = screen.getByRole('main');
    expect(within(main).getAllByText(item!.reference.retailerLabel).length).toBeGreaterThan(0);
    expect(within(main).getAllByText(item!.alternative.retailerLabel).length).toBeGreaterThan(0);
  });

  it('renders an empty state rather than crashing for an unknown comparison id', async () => {
    renderAppAt('/compare/does-not-exist');

    expect(await screen.findByText('Comparison not available')).toBeInTheDocument();
    // No card links, and no crash.
    expect(compareLinks()).toHaveLength(0);
  });

  it('renders a not-found state for an unknown category slug', async () => {
    renderAppAt('/category/not-a-category');

    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
  });
});
