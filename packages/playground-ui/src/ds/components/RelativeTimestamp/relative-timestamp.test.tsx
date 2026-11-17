// @vitest-environment jsdom
import '@/test/english-locale';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RelativeTimestamp } from './relative-timestamp';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const now = Date.UTC(2026, 8, 24, 12, 0, 0);

describe('RelativeTimestamp', () => {
  it('keeps the relative time without a focus popup', async () => {
    vi.useFakeTimers({ now, shouldAdvanceTime: true });
    const date = new Date(now - (3 * 60 + 12) * 1000);
    const { container } = render(<RelativeTimestamp value={date} />);
    const [time] = container.getElementsByTagName('time');
    expect(time.getAttribute('dateTime')).toBe(date.toISOString());
    expect(time.querySelector('[aria-hidden]')?.textContent).toBe('3m ago');

    act(() => time.focus());
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('keeps the labeled moment in accessible text', async () => {
    vi.useFakeTimers({ now, shouldAdvanceTime: true });
    const { container } = render(<RelativeTimestamp value={now - 12 * 3_600_000} label="Deployed" />);
    const [time] = container.getElementsByTagName('time');
    expect(time.querySelector('[aria-hidden]')?.textContent).toBe('12h ago');
    expect([...time.querySelectorAll('.font-mono')].map(word => word.textContent)).toEqual(['12h']);
    expect(time.querySelector('.sr-only')?.textContent).toMatch(/^Deployed /);

    act(() => time.focus());
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('keeps the visible label current', () => {
    vi.useFakeTimers({ now });
    const { container } = render(<RelativeTimestamp value={now - 59_000} />);
    const label = () => container.querySelector('[aria-hidden]')?.textContent;
    expect(label()).toBe('59s ago');
    act(() => vi.advanceTimersByTime(1000));
    expect(label()).toBe('1m ago');
  });

  it('renders nothing for an invalid date', () => {
    const { container } = render(<RelativeTimestamp value="not a date" />);
    expect(container.innerHTML).toBe('');
  });
});
