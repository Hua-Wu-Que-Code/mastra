// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { NoTracesInfo } from '../no-traces-info';
import { locale } from '@/lib/i18n';

afterEach(() => {
  cleanup();
  act(() => locale.setLocale('en'));
});

describe('NoTracesInfo', () => {
  it('keeps initial collection guidance separate from date-filter guidance', () => {
    const { container, rerender } = render(<NoTracesInfo datePreset="all" />);

    expect(screen.getByRole('heading', { name: 'No traces yet' })).toBeTruthy();
    expect(screen.getByText('Traces will appear here once agents, workflows, or tools are executed.')).toBeTruthy();
    expect(container.querySelector('svg[data-central-icon="IconCircleBanSign"]')).toBeTruthy();

    rerender(<NoTracesInfo datePreset="last-24h" />);

    expect(screen.getByRole('heading', { name: 'No traces for the last 24 hours' })).toBeTruthy();
    expect(screen.getByText('Pick a wider time range. Older traces may fall outside the current window.')).toBeTruthy();
    expect(screen.queryByText('No traces yet')).toBeNull();
    expect(container.querySelector('svg[data-central-icon="IconCircleBanSign"]')).toBeTruthy();
  });

  it('names spans when it stands for a span list', () => {
    const { rerender } = render(<NoTracesInfo resource="spans" datePreset="all" />);

    expect(screen.getByRole('heading', { name: 'No spans yet' })).toBeTruthy();
    expect(screen.getByText('Spans will appear here once agents, workflows, or tools are executed.')).toBeTruthy();

    rerender(<NoTracesInfo resource="spans" datePreset="last-7d" />);

    expect(screen.getByRole('heading', { name: 'No spans for the last 7 days' })).toBeTruthy();
    expect(screen.getByText('Pick a wider time range. Older spans may fall outside the current window.')).toBeTruthy();
  });

  it('names threads when it stands for a thread list', () => {
    const { rerender } = render(<NoTracesInfo resource="threads" datePreset="all" />);

    expect(screen.getByRole('heading', { name: 'No threads yet' })).toBeTruthy();
    expect(screen.getByText('Threads will appear here once agents, workflows, or tools are executed.')).toBeTruthy();

    rerender(<NoTracesInfo resource="threads" datePreset="last-7d" />);

    expect(screen.getByRole('heading', { name: 'No threads for the last 7 days' })).toBeTruthy();
    expect(
      screen.getByText('Pick a wider time range. Older threads may fall outside the current window.'),
    ).toBeTruthy();
  });

  it('preserves explicit dates in the custom-range empty state', () => {
    render(
      <NoTracesInfo datePreset="custom" dateFrom={new Date(2026, 8, 1, 9, 0)} dateTo={new Date(2026, 8, 7, 18, 0)} />,
    );

    expect(
      screen.getByRole('heading', {
        name: `No traces between ${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(2026, 8, 1, 9, 0))} and ${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(2026, 8, 7, 18, 0))}`,
      }),
    ).toBeTruthy();
  });
});

describe('when the interface language changes with a selected time range', () => {
  it('translates the complete trace guidance without changing the range', () => {
    render(<NoTracesInfo datePreset="last-7d" />);
    act(() => locale.setLocale('zh'));
    expect(screen.getByRole('heading', { name: '最近7天暂无调用追踪' })).toBeTruthy();
    expect(screen.getByText('请选择更大的时间范围，较早的调用追踪可能不在当前范围内。')).toBeTruthy();
    act(() => locale.setLocale('en'));
    expect(screen.getByRole('heading', { name: 'No traces for the last 7 days' })).toBeTruthy();
  });
  it('translates the span resource name', () => {
    act(() => locale.setLocale('zh'));
    render(<NoTracesInfo resource="spans" datePreset="last-7d" />);
    expect(screen.getByRole('heading', { name: '最近7天暂无调用片段' })).toBeTruthy();
  });
});
