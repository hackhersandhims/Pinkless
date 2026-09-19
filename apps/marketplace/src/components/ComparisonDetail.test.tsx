import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ComparisonDetail } from './ComparisonDetail';
import { makeComparisonView, withRouter } from '../test-utils';

describe('ComparisonDetail', () => {
  it('uses the difference as the page heading', () => {
    render(withRouter(<ComparisonDetail item={makeComparisonView()} />));

    expect(
      screen.getByRole('heading', { level: 1, name: 'The men’s version costs $0.80 less' }),
    ).toBeInTheDocument();
  });

  it('links both products to their Kroger pages in a new tab, safely', () => {
    const item = makeComparisonView();
    render(withRouter(<ComparisonDetail item={item} />));

    const men = screen.getByRole('link', { name: /see the men’s version on kroger/i });
    const women = screen.getByRole('link', { name: /see the women’s version on kroger/i });
    expect(men).toHaveAttribute('href', item.other.url);
    expect(women).toHaveAttribute('href', item.womens.url);

    const outbound = screen
      .getAllByRole('link')
      .filter((link) => (link.getAttribute('href') ?? '').startsWith('https://'));
    expect(outbound.length).toBeGreaterThanOrEqual(4);
    for (const link of outbound) {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link.getAttribute('rel')).toContain('noopener');
      expect(link.getAttribute('rel')).toContain('noreferrer');
    }
  });

  it('shows the store, price context, and checked date for each price', () => {
    render(withRouter(<ComparisonDetail item={makeComparisonView()} />));

    expect(screen.getAllByText('In store price at Kroger On the Rhine')).toHaveLength(2);
    expect(screen.getAllByText(/Checked Sep 19, 2026/).length).toBeGreaterThanOrEqual(2);
  });

  it('shows the rationale and every known difference', () => {
    const item = makeComparisonView({
      rationale: 'Both are 3-blade disposable razors in a 4-count pack.',
      knownDifferences: ['One is scented.', 'Handle color differs.'],
    });
    render(withRouter(<ComparisonDetail item={item} />));

    expect(screen.getByRole('heading', { name: 'Why these match' })).toBeInTheDocument();
    expect(screen.getByText(item.rationale)).toBeInTheDocument();
    expect(screen.getByText('Known differences')).toBeInTheDocument();
    expect(screen.getByText('One is scented.')).toBeInTheDocument();
    expect(screen.getByText('Handle color differs.')).toBeInTheDocument();
  });

  it('omits the "Known differences" heading when there are none', () => {
    render(withRouter(<ComparisonDetail item={makeComparisonView({ knownDifferences: [] })} />));

    expect(screen.queryByText(/known differences/i)).not.toBeInTheDocument();
  });

  it('carries the disclaimer and makes no claim about why prices differ', () => {
    render(withRouter(<ComparisonDetail item={makeComparisonView()} />));

    expect(screen.getByText(/may have changed/i)).toBeInTheDocument();
    expect(screen.getByText(/does not say why prices differ/i)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/discriminat|illegal|pink tax is/i);
  });
});
