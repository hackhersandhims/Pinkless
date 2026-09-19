import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../App.js';
import {
  FIXTURE_EVEN_STORE_ID,
  FIXTURE_STORE_ID,
  FIXTURE_STORE_NAME,
} from '../lib/fixtures/fixture-feed.js';
import { mockApi } from '../test-utils.js';

const PAIR_ID = 'bic-soleil-smooth-vs-comfort-3-advance';
const STORE_QUERY = new URLSearchParams({
  store: FIXTURE_STORE_ID,
  storeName: FIXTURE_STORE_NAME,
}).toString();

/**
 * App owns its own BrowserRouter internally, so tests drive navigation via
 * window.history rather than wrapping in a MemoryRouter.
 */
function renderAppAt(path: string) {
  window.history.pushState({}, '', path);
  return render(<App />);
}

function compareLinks() {
  return screen
    .queryAllByRole('link')
    .filter((link) => (link.getAttribute('href') ?? '').startsWith('/compare/'));
}

async function waitForFeed() {
  await waitFor(() => expect(compareLinks().length).toBeGreaterThan(0));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('store selection', () => {
  it('leads with a store picker when no store is chosen, and loads no prices', async () => {
    const fetchMock = mockApi();
    renderAppAt('/');

    expect(
      screen.getByRole('heading', { name: 'Start with your Kroger store' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('ZIP code')).toBeInTheDocument();
    expect(compareLinks()).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('finds stores by ZIP, puts the chosen store in the URL, and shows its comparisons', async () => {
    const user = userEvent.setup();
    const fetchMock = mockApi();
    renderAppAt('/');

    await user.type(screen.getByLabelText('ZIP code'), '45202');
    await user.click(screen.getByRole('button', { name: /find stores/i }));

    const list = await screen.findByRole('list', { name: 'Kroger stores near 45202' });
    expect(screen.getByText('2 stores near 45202. Choose one.')).toBeInTheDocument();
    await user.click(within(list).getByRole('button', { name: /Kroger On the Rhine/ }));

    const params = new URLSearchParams(window.location.search);
    expect(params.get('store')).toBe(FIXTURE_STORE_ID);
    expect(params.get('storeName')).toBe(FIXTURE_STORE_NAME);

    await waitForFeed();
    expect(
      fetchMock.mock.calls.some((call) =>
        String(call[0]).includes(`/api/comparisons?locationId=${FIXTURE_STORE_ID}`),
      ),
    ).toBe(true);
    expect(screen.getByText(FIXTURE_STORE_NAME, { selector: 'dd' })).toBeInTheDocument();
  });

  it('validates the ZIP code before looking anything up', async () => {
    const user = userEvent.setup();
    const fetchMock = mockApi();
    renderAppAt('/');

    await user.type(screen.getByLabelText('ZIP code'), '452');
    await user.click(screen.getByRole('button', { name: /find stores/i }));

    expect(screen.getByText('Enter a five-digit US ZIP code.')).toBeInTheDocument();
    expect(screen.getByLabelText('ZIP code')).toHaveAttribute('aria-invalid', 'true');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows the chosen store in the header with a keyboard-operable "Change store" control', async () => {
    const user = userEvent.setup();
    mockApi();
    renderAppAt(`/?${STORE_QUERY}`);
    await waitForFeed();

    const banner = screen.getByRole('banner');
    expect(within(banner).getByText(FIXTURE_STORE_NAME)).toBeInTheDocument();
    const toggle = within(banner).getByRole('button', { name: 'Change store' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    toggle.focus();
    await user.keyboard('{Enter}');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(within(banner).getByLabelText('ZIP code')).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
  });
});

describe('with a store chosen', () => {
  it('shows the comparison card with both names, prices, store, and date', async () => {
    mockApi();
    renderAppAt(`/?${STORE_QUERY}`);
    await waitForFeed();

    const rail = screen.getByRole('region', { name: 'Biggest differences' });
    const [card] = within(rail).getAllByRole('link', { name: /costs \$0\.80 less/ });
    expect(card).toHaveAttribute('href', `/compare/${PAIR_ID}?${STORE_QUERY}`);
    expect(
      within(card!).getByText('BIC Soleil Smooth Scented Disposable 3-Blade Razors'),
    ).toBeInTheDocument();
    expect(within(card!).getByText('BIC Comfort 3 Advance Disposable Razors')).toBeInTheDocument();
    expect(within(card!).getByText('$6.79')).toBeInTheDocument();
    expect(within(card!).getByText('$5.99')).toBeInTheDocument();
    expect(within(card!).getByText(/In store · Checked Sep 19, 2026/)).toBeInTheDocument();
  });

  it('features the pair in the hero with a men’s-cheaper summary', async () => {
    mockApi();
    renderAppAt(`/?${STORE_QUERY}`);

    const featured = await screen.findByRole('link', { name: /^Featured comparison:/ });
    expect(featured).toHaveAttribute('href', `/compare/${PAIR_ID}?${STORE_QUERY}`);
    expect(featured.getAttribute('aria-label')).toContain('The men’s version costs $0.80 less');
  });

  it('derives the stat strip from the feed', async () => {
    mockApi();
    renderAppAt(`/?${STORE_QUERY}`);
    await waitForFeed();

    const strip = screen.getByRole('region', { name: 'This store at a glance' });
    expect(within(strip).getByText('1')).toBeInTheDocument();
    expect(within(strip).getByText('$0.80')).toBeInTheDocument();
    expect(within(strip).getByText(FIXTURE_STORE_NAME)).toBeInTheDocument();
  });

  it('has one h1 and the banner, nav, main, footer, and search landmarks', async () => {
    mockApi();
    renderAppAt(`/?${STORE_QUERY}`);
    await waitForFeed();

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Browse' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByRole('search')).toBeInTheDocument();
  });

  it('keeps the store on category nav links', async () => {
    mockApi();
    renderAppAt(`/?${STORE_QUERY}`);
    await waitForFeed();

    const nav = screen.getByRole('navigation', { name: 'Browse' });
    const hrefs = within(nav)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));
    expect(hrefs).toEqual([`/search?${STORE_QUERY}`, `/category/razors?${STORE_QUERY}`]);
  });

  it('renders the comparison page with both Kroger links, rationale, and differences', async () => {
    mockApi();
    renderAppAt(`/compare/${PAIR_ID}?${STORE_QUERY}`);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'The men’s version costs $0.80 less' }),
    ).toBeInTheDocument();
    const men = screen.getByRole('link', { name: /see the men’s version on kroger/i });
    expect(men.getAttribute('href')).toMatch(/0007033071397$/);
    expect(men).toHaveAttribute('target', '_blank');
    const women = screen.getByRole('link', { name: /see the women’s version on kroger/i });
    expect(women.getAttribute('href')).toMatch(/0007033071417$/);
    expect(screen.getByText(/listed as scented/)).toBeInTheDocument();
    expect(screen.getAllByText(`In store price at ${FIXTURE_STORE_NAME}`)).toHaveLength(2);
  });

  it('filters with search and keeps the store in the URL', async () => {
    const user = userEvent.setup();
    mockApi();
    renderAppAt(`/?${STORE_QUERY}`);
    await waitForFeed();

    await user.type(screen.getByLabelText(/search products or categories/i), 'comfort{enter}');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Results for “comfort”' }),
    ).toBeInTheDocument();
    const params = new URLSearchParams(window.location.search);
    expect(params.get('q')).toBe('comfort');
    expect(params.get('store')).toBe(FIXTURE_STORE_ID);
    expect(compareLinks()).toHaveLength(1);
  });

  it('offers a way out when nothing matches', async () => {
    mockApi();
    renderAppAt(`/search?${STORE_QUERY}&q=zzzznotaproduct`);

    expect(await screen.findByText(/No comparisons match/)).toBeInTheDocument();
    expect(compareLinks()).toHaveLength(0);
    expect(screen.getByRole('link', { name: 'Show all comparisons' })).toHaveAttribute(
      'href',
      `/search?${STORE_QUERY}`,
    );
  });

  it('stays quiet at a store where no pair is cheaper', async () => {
    mockApi();
    renderAppAt(`/?store=${FIXTURE_EVEN_STORE_ID}`);

    expect(await screen.findByText('No comparisons at this store right now')).toBeInTheDocument();
    expect(compareLinks()).toHaveLength(0);
    expect(screen.getAllByText(/Kroger store fixture-even-store/).length).toBeGreaterThan(0);
  });

  it('shows an empty state for an unknown comparison id', async () => {
    mockApi();
    renderAppAt(`/compare/does-not-exist?${STORE_QUERY}`);

    expect(await screen.findByText('Comparison not available')).toBeInTheDocument();
    expect(compareLinks()).toHaveLength(0);
  });

  it('asks for a store on a comparison link without one', async () => {
    mockApi();
    renderAppAt(`/compare/${PAIR_ID}`);

    expect(
      screen.getByRole('heading', { name: 'Choose a Kroger store to see comparisons' }),
    ).toBeInTheDocument();
  });

  it('renders a not-found state for an unknown category slug', async () => {
    mockApi();
    renderAppAt(`/category/not-a-category?${STORE_QUERY}`);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument();
  });
});

describe('feed load failure', () => {
  it('shows plain-language copy, no raw error, no fixture prices, and recovers on retry', async () => {
    const user = userEvent.setup();
    mockApi({ failComparisons: 1 });
    renderAppAt(`/?${STORE_QUERY}`);

    expect(await screen.findByText("We couldn't load comparisons")).toBeInTheDocument();
    expect(screen.queryByText(/503/)).not.toBeInTheDocument();
    expect(screen.queryByText('$5.99')).not.toBeInTheDocument();
    expect(compareLinks()).toHaveLength(0);

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    await waitForFeed();
    expect(screen.queryByText("We couldn't load comparisons")).not.toBeInTheDocument();
  });
});
