import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ComparisonCard } from './ComparisonCard';
import { makeComparisonView, withRouter } from '../test-utils';

describe('ComparisonCard', () => {
  it('renders the product name, both retailer labels, and the observed date', () => {
    const item = makeComparisonView({
      name: 'Sample Razor',
      reference: {
        retailer: 'cvs',
        retailerLabel: 'CVS',
        url: 'https://cvs.example/product',
        priceCents: 1349,
        priceContext: 'online',
        priceContextLabel: 'Online',
        observedAt: '2026-09-18T12:00:00.000Z',
      },
      alternative: {
        retailer: 'walmart',
        retailerLabel: 'Walmart',
        url: 'https://walmart.example/product',
        priceCents: 999,
        priceContext: 'online',
        priceContextLabel: 'Online',
        observedAt: '2026-09-18T12:00:00.000Z',
      },
      savingsCents: 350,
    });

    render(withRouter(<ComparisonCard item={item} />));

    expect(screen.getByText('Sample Razor')).toBeInTheDocument();
    expect(screen.getByText('CVS')).toBeInTheDocument();
    expect(screen.getByText('Walmart')).toBeInTheDocument();
    expect(screen.getByText(/Sep 18, 2026/)).toBeInTheDocument();
  });

  it('renders the savings line and never renders $0.00', () => {
    const item = makeComparisonView({ savingsCents: 350 });
    render(withRouter(<ComparisonCard item={item} />));

    expect(screen.getByText(/\$3\.50/)).toBeInTheDocument();
    expect(screen.queryByText('$0.00')).not.toBeInTheDocument();
  });

  it('links to /compare/<id>', () => {
    const item = makeComparisonView({ id: 'razor-5blade-cartridge-4ct' });
    render(withRouter(<ComparisonCard item={item} />));

    const link = screen.getByRole('link', { name: /Sample Razor/i });
    expect(link).toHaveAttribute('href', '/compare/razor-5blade-cartridge-4ct');
  });
});
