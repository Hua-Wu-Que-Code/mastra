// @vitest-environment jsdom
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MetricsProvider } from '../../hooks/use-metrics';
import { useMetricsActivity } from '../../hooks/use-metrics-activity';
import { useMetricsLatency } from '../../hooks/use-metrics-latency';
import { useMetricsScores } from '../../hooks/use-metrics-scores';
import { AgentRunsCard } from '../agent-runs-card';
import { FailureRateCard } from '../failure-rate-card';
import { LatencyCard } from '../latency-card';
import { ScoresCard } from '../scores-card';
import { TokenUsageCard } from '../token-usage-card';
import { TraceVolumeCard } from '../trace-volume-card';
import { UsageCard } from '../usage-card';
import { emptyMetrics, failingMetrics, openViewMenu, pickView, renderInMetrics, seedMetrics } from './metrics-msw';
import { locale } from '@/lib/i18n';
import { renderWithProviders } from '@/test/render';

const onEntityClick = vi.fn();
const onThreadClick = vi.fn();

afterEach(() => locale.adopt('en'));

function BucketDates() {
  const activity = useMetricsActivity();
  const latency = useMetricsLatency('agents');
  const scores = useMetricsScores();
  return (
    <>
      <output aria-label="Token dates">{activity.data?.[0]?.time}</output>
      <output aria-label="Latency dates">{latency.data?.[0]?.time}</output>
      <output aria-label="Score dates">{scores.data?.buckets[0]?.time}</output>
    </>
  );
}

describe('Metrics localization', () => {
  describe('when the interface is Chinese', () => {
    it('translates the empty chart message', async () => {
      locale.adopt('zh');
      emptyMetrics();
      renderInMetrics(<TokenUsageCard />);
      expect(await screen.findByText('此时间范围内暂无数据')).toBeDefined();
    });

    it.each([
      { card: <TokenUsageCard />, title: 'Token 用量', options: ['Token 用量', '模型成本'] },
      { card: <LatencyCard />, title: '智能体延迟', options: ['智能体延迟', '工作流延迟', '工具延迟'] },
      { card: <TraceVolumeCard />, title: '智能体运行', options: ['智能体运行', '工作流运行', '工具调用'] },
      {
        card: <UsageCard />,
        title: '按智能体统计用量',
        options: ['按智能体统计用量', '按模型统计用量', '按对话统计用量'],
      },
    ])('translates the $title card and its view menu', async ({ card, title, options }) => {
      locale.adopt('zh');
      seedMetrics();
      renderInMetrics(card);
      expect(await openViewMenu(title)).toEqual(options);
    });
  });

  describe('when the language changes while metrics are open', () => {
    it('translates the selected views without resetting them', async () => {
      seedMetrics();
      renderInMetrics(
        <>
          <TokenUsageCard />
          <LatencyCard />
          <UsageCard />
        </>,
      );
      await screen.findByText('1.30K');
      await pickView('Token usage', 'Model cost');
      await pickView('Agent latency', 'Tool latency');
      await pickView('Usage by agent', 'Usage by model');
      act(() => locale.adopt('zh'));
      for (const title of ['模型成本', '工具延迟', '按模型统计用量']) {
        expect(screen.getByRole('button', { name: title })).toBeDefined();
      }
      act(() => locale.adopt('en'));
      for (const title of ['Model cost', 'Tool latency', 'Usage by model']) {
        expect(screen.getByRole('button', { name: title })).toBeDefined();
      }
    });

    it('reformats dates already loaded in the query cache', async () => {
      seedMetrics();
      const { queryClient } = renderInMetrics(<BucketDates />);
      await waitFor(() => expect(queryClient.isFetching()).toBe(0));
      for (const name of ['Token dates', 'Latency dates', 'Score dates']) {
        expect(screen.getByLabelText(name).textContent).toMatch(/[A-Za-z]{3}/);
      }
      act(() => locale.adopt('zh'));
      for (const name of ['Token dates', 'Latency dates', 'Score dates']) {
        expect(screen.getByLabelText(name).textContent).toContain('月');
        expect(screen.getByLabelText(name).textContent).not.toMatch(/AM|PM/);
      }
    });
  });
});

function renderDashboard() {
  onEntityClick.mockReset();
  onThreadClick.mockReset();
  return renderWithProviders(
    <MetricsProvider preset="24h" filterTokens={[]} onPresetChange={() => {}} onFilterTokensChange={() => {}}>
      <TokenUsageCard />
      <AgentRunsCard />
      <FailureRateCard />
      <LatencyCard />
      <TraceVolumeCard onEntityClick={onEntityClick} />
      <UsageCard onThreadClick={onThreadClick} />
      <ScoresCard />
    </MetricsProvider>,
  );
}

describe('Metrics cards', () => {
  describe('when the range has data', () => {
    beforeEach(() => {
      seedMetrics();
      renderDashboard();
    });

    it('says when a latency view has no runs', async () => {
      expect(await screen.findByText('4.50s')).toBeDefined();
      await pickView('Agent latency', 'Workflow latency');
      expect(await screen.findByText('No data in this range')).toBeDefined();
    });

    it('ranks threads by what they spent and reports which one was clicked', async () => {
      await screen.findByRole('button', { name: /Chef Agent/ });
      await pickView('Usage by agent', 'Usage by thread');
      fireEvent.click(await screen.findByRole('button', { name: /thread-big/ }));
      expect(onThreadClick).toHaveBeenCalledWith('thread-big');
      expect(screen.getByText('$1.25')).toBeDefined();
      expect(screen.getByText('42.0K')).toBeDefined();
    });

    it('charts each scorer found in the recent scores', async () => {
      expect(await screen.findByText('Answer relevancy')).toBeDefined();
    });
  });

  describe('when the range is empty', () => {
    it('says so in every card', async () => {
      emptyMetrics();
      renderDashboard();

      // Every chart says the same: token usage, runs, failure rate, latency and scores. Tables say what's missing.
      await waitFor(() => expect(screen.getAllByText('No data in this range')).toHaveLength(5));
      expect(screen.getByText('No runs in this range.')).toBeDefined();
      expect(screen.getByText('No model usage in this range.')).toBeDefined();
    });
  });

  describe('when the metrics API fails', () => {
    beforeEach(() => {
      failingMetrics();
      renderDashboard();
    });

    it('shows an error in every chart card instead of an empty state', async () => {
      // Token usage, runs, failure rate, latency, trace volume, usage and scores (after the client's retries).
      await waitFor(
        () => expect(screen.getAllByText("Couldn't load this data. Try again in a moment.")).toHaveLength(7),
        { timeout: 5000 },
      );
      expect(screen.queryByText('No data in this range')).toBeNull();
    });
  });
});
