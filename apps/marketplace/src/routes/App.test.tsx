import { describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  it('lists every active comparison once in the "Biggest savings" rail, largest saving first (REQUIREMENTS §8)', async () => {
    const expected = getActiveComparisons(await loadComparisons())
      .slice()
      .sort((x, y) => y.savingsCents - x.savingsCents || (x.id < y.id ? -1 : 1));
    expect(expected.length).toBeGreaterThan(0);

    renderAppAt('/');
    await waitForFeed();

    const rail = screen.getByRole('region', { name: 'Biggest savings' });
    const hrefs = within(rail)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'))
      .filter((href) => (href ?? '').startsWith('/compare/'));

    // Exactly once per comparison, in savings order, none missing or extra.
    expect(hrefs).toEqual(expected.map((item) => `/compare/${item.id}`));
  });

  it('features the largest saving in the hero, linking to its comparison', async () => {
    const [largest] = getActiveComparisons(await loadComparisons())
      .slice()
      .sort((x, y) => y.savingsCents - x.savingsCents || (x.id < y.id ? -1 : 1));

    renderAppAt('/');
    const featured = await screen.findByRole('link', { name: /^Featured comparison:/ });

    expect(featured).toHaveAttribute('href', `/compare/${largest!.id}`);
  });

  it('offers a tile per category with comparisons, plus one for everything', async () => {
    const groups = groupByCategory(getActiveComparisons(await loadComparisons()));

    renderAppAt('/');
    await waitForFeed();

    const section = screen.getByRole('region', { name: 'Shop by category' });
    const hrefs = within(section)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));
    expect(hrefs).toEqual([...groups.map((group) => `/category/${group.slug}`), '/search']);
  });

  it('has one h1 and the banner, nav, main, and footer landmarks on the home page', async () => {
    renderAppAt('/');
    await waitForFeed();

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Browse' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(screen.getByLabelText(/search products, brands, or categories/i)).toHaveAttribute(
      'type',
      'search',
    );
  });

  it('derives the category nav from the categories that have comparisons', async () => {
    const groups = groupByCategory(getActiveComparisons(await loadComparisons()));

    renderAppAt('/');
    await waitForFeed();

    const nav = screen.getByRole('navigation', { name: 'Browse' });
    const links = within(nav)
      .getAllByRole('link')
      .map((link) => link.textContent);
    expect(links).toEqual(['All comparisons', ...groups.map((group) => group.label)]);
  });

  it('derives the stat strip from the feed', async () => {
    const items = getActiveComparisons(await loadComparisons());
    const largest = Math.max(...items.map((item) => item.savingsCents));

    renderAppAt('/');
    await waitForFeed();

    const strip = screen.getByRole('region', { name: 'Marketplace at a glance' });
    expect(within(strip).getByText(String(items.length))).toBeInTheDocument();
    expect(within(strip).getByText(`$${(largest / 100).toFixed(2)}`)).toBeInTheDocument();
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

  it('renders a real same-retailer comparison with the outbound link', async () => {
    const [item] = getActiveComparisons(await loadComparisons());
    expect(item).toBeDefined();

    renderAppAt(`/compare/${item!.id}`);

    const cta = await screen.findByRole('link', { name: /see men's alternative/i });
    expect(cta).toHaveAttribute('href', item!.alternative.url);
    expect(cta).toHaveAttribute('target', '_blank');
    expect(cta.getAttribute('rel') ?? '').toContain('noopener');

    // §8: the source retailer for each displayed offer must be identifiable.
    const main = screen.getByRole('main');
    expect(
      within(main).getAllByText(new RegExp(item!.reference.retailerLabel)).length,
    ).toBeGreaterThan(0);
    expect(item!.alternative.retailer).toBe(item!.reference.retailer);
    expect(within(main).getAllByText(item!.alternativeName).length).toBeGreaterThan(0);
  });

  it('renders an empty state rather than crashing for an unknown comparison id', async () => {
    renderAppAt('/compare/does-not-exist');

    expect(await screen.findByText('Comparison not available')).toBeInTheDocument();
    // No card links, and no crash.
    expect(compareLinks()).toHaveLength(0);
  });

  it('renders a not-found state for an unknown category slug', async () => {
    renderAppAt('/category/not-a-category');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument();
  });
});

describe('search', () => {
  it('lists every comparison once at /search with no query', async () => {
    const expected = getActiveComparisons(await loadComparisons());

    renderAppAt('/search');
    await waitForFeed();

    expect(screen.getByRole('heading', { level: 1, name: 'All comparisons' })).toBeInTheDocument();
    expect(compareLinks()).toHaveLength(expected.length);
  });

  it('filters to matching comparisons for /search?q=', async () => {
    const items = getActiveComparisons(await loadComparisons());
    const razor = items.find((item) => item.category === 'razors');
    expect(razor).toBeDefined();
    // Independent of the search helper: "razor" only occurs in razor products' own text.
    const expected = items.filter((item) => item.category === 'razors');

    renderAppAt('/search?q=razor');
    await waitForFeed();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Results for “razor”' }),
    ).toBeInTheDocument();
    expect(compareLinks()).toHaveLength(expected.length);
    expect(compareLinks().map((link) => link.getAttribute('href'))).toContain(
      `/compare/${razor!.id}`,
    );
  });

  it('offers a way out when nothing matches', async () => {
    renderAppAt('/search?q=zzzznotaproduct');

    expect(await screen.findByText(/No comparisons match/)).toBeInTheDocument();
    expect(compareLinks()).toHaveLength(0);
    expect(screen.getByRole('link', { name: 'Show all comparisons' })).toHaveAttribute(
      'href',
      '/search',
    );
  });

  it('searches from the header box and lands on the results', async () => {
    const user = userEvent.setup();
    renderAppAt('/');
    await waitForFeed();

    await user.type(
      screen.getByLabelText(/search products, brands, or categories/i),
      'deodorant{enter}',
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Results for “deodorant”' }),
    ).toBeInTheDocument();
    expect(window.location.pathname + window.location.search).toBe('/search?q=deodorant');
  });
});

describe('sort and filter', () => {
  it('reorders the grid when the sort changes', async () => {
    const user = userEvent.setup();
    renderAppAt('/search');
    await waitForFeed();

    const byName = getActiveComparisons(await loadComparisons())
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name) || (a.id < b.id ? -1 : 1))
      .map((item) => `/compare/${item.id}`);

    await user.selectOptions(screen.getByLabelText('Sort by'), 'name');

    expect(compareLinks().map((link) => link.getAttribute('href'))).toEqual(byName);
  });

  it('narrows to comparisons cheaper at the chosen retailer', async () => {
    const user = userEvent.setup();
    const items = getActiveComparisons(await loadComparisons());
    const retailers = [...new Set(items.map((item) => item.alternative.retailer))];
    // The control only exists when there is a real choice to make.
    expect(retailers.length).toBeGreaterThan(1);
    const chosen = retailers[0]!;
    const expected = items.filter((item) => item.alternative.retailer === chosen);

    renderAppAt('/search');
    await waitForFeed();

    await user.selectOptions(screen.getByLabelText('Cheaper at'), chosen);

    expect(compareLinks()).toHaveLength(expected.length);
  });
});
