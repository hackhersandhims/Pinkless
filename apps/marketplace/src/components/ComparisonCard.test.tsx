import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ComparisonCard } from './ComparisonCard';
import { makeComparisonView, withRouter } from '../test-utils';

describe('ComparisonCard', () => {
  it('shows both product names, both prices, the store, price context, and date', () => {
    const item = makeComparisonView();
    render(withRouter(<ComparisonCard item={item} />));

    expect(screen.getByText('Sample Women’s Razor')).toBeInTheDocument();
    expect(screen.getByText('Sample Men’s Razor')).toBeInTheDocument();
    expect(screen.getByText('$6.79')).toBeInTheDocument();
    expect(screen.getByText('$5.99')).toBeInTheDocument();
    expect(screen.getByText('Marketed to women')).toBeInTheDocument();
    expect(screen.getByText('Marketed to men')).toBeInTheDocument();
    expect(
      screen.getByText('Kroger On the Rhine · In store · Checked Sep 19, 2026'),
    ).toBeInTheDocument();
  });

  it('leads with the men’s-version headline and never renders $0.00', () => {
    render(withRouter(<ComparisonCard item={makeComparisonView()} />));

    expect(
      screen.getByRole('heading', { name: 'The men’s version costs $0.80 less' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('$0.00')).not.toBeInTheDocument();
  });

  it('says "neutral version" for a product not marketed to a gender', () => {
    render(withRouter(<ComparisonCard item={makeComparisonView({ otherMarketedTo: 'neutral' })} />));

    expect(
      screen.getByRole('heading', { name: 'The neutral version costs $0.80 less' }),
    ).toBeInTheDocument();
  });

  it('shows the first known difference', () => {
    render(
      withRouter(
        <ComparisonCard
          item={makeComparisonView({ knownDifferences: ['One is scented.', 'Handles differ.'] })}
        />,
      ),
    );
    expect(screen.getByText('One is scented.')).toBeInTheDocument();
    expect(screen.queryByText('Handles differ.')).not.toBeInTheDocument();
  });

  it('links to /compare/<id>, keeping the chosen store', () => {
    const item = makeComparisonView({ id: 'bic-pair' });
    render(withRouter(<ComparisonCard item={item} />, ['/?store=01400513&storeName=Rhine']));

    const link = screen.getByRole('link', { name: /Sample Women’s Razor/ });
    expect(link).toHaveAttribute('href', '/compare/bic-pair?store=01400513&storeName=Rhine');
  });

  it('renders Kroger product photos, falling back to the illustration on error', () => {
    const item = makeComparisonView();
    const { container } = render(withRouter(<ComparisonCard item={item} />));

    const images = container.querySelectorAll('img');
    expect(images).toHaveLength(2);
    expect(images[0]).toHaveAttribute(
      'src',
      `https://www.kroger.com/product/images/medium/front/${item.womens.krogerProductId}`,
    );
    expect(images[0]).toHaveAttribute('alt', item.womens.name);
    expect(images[0]).toHaveAttribute('loading', 'lazy');

    fireEvent.error(images[0]!);
    expect(container.querySelectorAll('img')).toHaveLength(1);
    expect(container.querySelectorAll('svg').length).toBeGreaterThan(0);
  });
});
