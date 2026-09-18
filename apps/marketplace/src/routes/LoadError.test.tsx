import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// First load fails, later loads use the real local feed: exercises error -> retry -> ready.
vi.mock('../lib/api.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api.js')>();
  let calls = 0;
  return {
    ...actual,
    loadComparisons: vi.fn(async () => {
      calls += 1;
      if (calls === 1) throw new Error('Pinkless API returned 500 for /api/comparisons.');
      return actual.loadComparisons();
    }),
  };
});

import { App } from '../App.js';

describe('feed load failure', () => {
  it('shows plain-language copy without the raw error, and recovers on retry', async () => {
    window.history.pushState({}, '', '/');
    render(<App />);

    expect(await screen.findByText("We couldn't load comparisons")).toBeInTheDocument();
    expect(screen.queryByText(/500/)).not.toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));

    const cards = await screen.findAllByRole('link', { name: /save \$/i });
    expect(cards.length).toBeGreaterThan(0);
    expect(screen.queryByText("We couldn't load comparisons")).not.toBeInTheDocument();
  });
});
