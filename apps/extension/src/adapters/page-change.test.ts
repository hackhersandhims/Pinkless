import { Window } from 'happy-dom';
import { describe, expect, it, vi } from 'vitest';
import { observePageChanges } from './page-change.js';

describe('observePageChanges', () => {
  it('debounces a burst of variant DOM mutations', async () => {
    const window = new Window();
    const document = window.document as unknown as Document;
    const onChange = vi.fn();
    const disconnect = observePageChanges(document, onChange, 5);

    const option = document.createElement('button');
    document.body.append(option);
    option.setAttribute('aria-checked', 'true');
    option.textContent = '4 count';

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(onChange).toHaveBeenCalledTimes(1);

    disconnect();
    option.setAttribute('aria-checked', 'false');
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
