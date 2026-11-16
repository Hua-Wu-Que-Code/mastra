import { EntityType } from '@mastra/core/observability';
import { useState } from 'react';
import type { TimeRange } from '../drilldown';
import { useMetricsActivity } from '../hooks/use-metrics-activity';
import { useMetricsFilters } from '../hooks/use-metrics-filters';
import { EDGE_BUCKET_AXIS } from '../lib/chart-axis';
import { CHART_COLORS } from '../lib/chart-colors';
import { formatCount } from '../lib/chart-format';
import { bucketPlan, bucketWindow } from '../lib/metrics-buckets';
import { ChartArea } from './chart-area';
import { ChartCard } from './chart-card';
import type { ChartCardProps } from './chart-card';
import { ChartCardError } from './chart-card-error';
import { FailureRateCard } from './failure-rate-card';
import { MetricsCard } from '@/ds/components/MetricsCard';
import { MetricsLineChartLegend } from '@/ds/components/MetricsLineChart';
import { MetricsStackedBarChart } from '@/ds/components/MetricsStackedBarChart';
import { t as studioT, useLocale } from '@/lib/i18n';

const SERIES = [
  {
    dataKey: 'completed',
    get label() {
      return studioT('Completed');
    },
    color: CHART_COLORS.green,
  },
  {
    dataKey: 'failed',
    get label() {
      return studioT('Failed');
    },
    color: CHART_COLORS.error,
  },
];

type View = 'runs' | 'failure';

const VIEWS = [
  {
    value: 'runs',
    get label() {
      return studioT('Agent runs');
    },
  },
  {
    value: 'failure',
    get label() {
      return studioT('Failure rate');
    },
  },
] as const satisfies readonly { value: View; label: string }[];

/**
 * Completed and failed agent runs per bucket, or the share that failed; the title switches between
 * them. A column or point opens its agent traces.
 */
export type AgentRunsCardProps = {
  /** Called with the time range of the clicked column (Agent runs). */
  onTimeRangeClick?: (range: TimeRange) => void;
  /** Called with the time range of the clicked point (Failure rate), for its failed runs. */
  onFailureTimeRangeClick?: (range: TimeRange) => void;
  /** Called from the "View errors in logs" button (Failure rate). */
  onViewErrors?: () => void;
};

export function AgentRunsCard({ onTimeRangeClick, onFailureTimeRangeClick, onViewErrors }: AgentRunsCardProps) {
  const [view, setView] = useState<View>('runs');
  const titleMenu = { value: view, onValueChange: setView, options: VIEWS };
  if (view === 'failure') {
    return (
      <FailureRateCard titleMenu={titleMenu} onViewErrors={onViewErrors} onTimeRangeClick={onFailureTimeRangeClick} />
    );
  }
  return <AgentRunsChart titleMenu={titleMenu} onTimeRangeClick={onTimeRangeClick} />;
}

function AgentRunsChart({
  onTimeRangeClick,
  titleMenu,
}: Pick<AgentRunsCardProps, 'onTimeRangeClick'> & { titleMenu: ChartCardProps<View>['titleMenu'] }) {
  useLocale();
  const { data = [], isLoading, isError, isPlaceholderData } = useMetricsActivity();
  const { timestamp } = useMetricsFilters();
  const { stepHours } = bucketPlan(timestamp.start, timestamp.end);
  const total = data.reduce((sum, b) => sum + b.completed + b.failed, 0);

  const layout = {
    title: studioT('Agent runs'),
    titleMenu,
    toolbar: (
      <MetricsCard.Toolbar>
        <MetricsLineChartLegend series={SERIES} />
      </MetricsCard.Toolbar>
    ),
  };

  if (isError) {
    return (
      <ChartCard {...layout}>
        <ChartCardError />
      </ChartCard>
    );
  }

  return (
    <ChartCard {...layout} total={formatCount(total)} isLoading={isLoading} isUpdating={isPlaceholderData}>
      <ChartArea isEmpty={!isLoading && total === 0}>
        <MetricsStackedBarChart
          data={data}
          series={SERIES}
          height="fill"
          xLabels="edges"
          showLegend={false}
          valueFormatter={formatCount}
          onBucketClick={onTimeRangeClick && (row => onTimeRangeClick(bucketWindow(Number(row.ts), stepHours)))}
          isLoading={isLoading}
          {...EDGE_BUCKET_AXIS}
        />
      </ChartArea>
    </ChartCard>
  );
}
