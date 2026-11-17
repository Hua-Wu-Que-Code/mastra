// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CompactNumber } from './compact-number';

afterEach(() => {
  cleanup();
});

describe('CompactNumber', () => {
  it('retains the accessible value without a focus popup', async () => {
    const { container } = render(<CompactNumber value={12_310} />);
    expect(screen.getByText('12.3K')).toBeTruthy();
    act(() => container.querySelector<HTMLElement>('[tabindex="0"]')?.focus());
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('skips the tooltip when nothing is hidden', () => {
    const { container } = render(<CompactNumber value={42.5} currency="USD" />);
    expect(container.textContent).toBe('$42.50');
    expect(container.querySelector('[tabindex]')).toBeNull();
  });
});
