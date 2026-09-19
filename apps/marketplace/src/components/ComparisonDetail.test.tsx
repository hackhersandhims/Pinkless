import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ComparisonDetail } from './ComparisonDetail';
import { makeComparisonView, withRouter } from '../test-utils';

describe('ComparisonDetail', () => {
  it("links the men's alternative to its same-retailer URL in a new tab", () => {
    const item = makeComparisonView({
      alternative: {
        retailer: 'cvs',
        retailerLabel: 'CVS',
        url: 'https://cvs.example/product/abc',
        priceCents: 999,
        priceContext: 'online',
        priceContextLabel: 'Online',
        observedAt: '2026-09-18T12:00:00.000Z',
      },
    });

    render(withRouter(<ComparisonDetail item={item} />));

    const link = screen.getByRole('link', { name: /see men's alternative/i });
    expect(link).toHaveAttribute('href', item.alternative.url);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel')).toEqual(expect.stringContaining('noopener'));
  });

  it('omits the "Known differences" heading when knownDifferences is empty', () => {
    const item = makeComparisonView({ knownDifferences: [] });
    render(withRouter(<ComparisonDetail item={item} />));

    expect(screen.queryByText(/known differences/i)).not.toBeInTheDocument();
  });

  it('shows the "Known differences" heading when knownDifferences is non-empty', () => {
    const item = makeComparisonView({
      knownDifferences: ['Handle color varies by retailer allocation.'],
    });
    render(withRouter(<ComparisonDetail item={item} />));

    expect(screen.getByText(/known differences/i)).toBeInTheDocument();
    expect(screen.getByText('Handle color varies by retailer allocation.')).toBeInTheDocument();
  });

  it('renders the disclaimer text', () => {
    const item = makeComparisonView();
    render(withRouter(<ComparisonDetail item={item} />));

    expect(screen.getByText(/prices verified.*may have changed/i)).toBeInTheDocument();
  });
});
