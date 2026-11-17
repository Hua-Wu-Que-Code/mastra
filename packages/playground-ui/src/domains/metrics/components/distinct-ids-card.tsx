import type { DrilldownScope } from '../drilldown';
import { DISTINCT_IDS_TITLE, DistinctIdsChart } from './distinct-ids/distinct-ids-chart';
import { TraceAggregateCard } from './trace-aggregate-card';
import { t as studioT, useLocale } from '@/lib/i18n';

export type DistinctIdsCardProps = {
  /** Called with the time range of the clicked bucket. */
  onTimeRangeClick?: (scope: DrilldownScope) => void;
};

/** Distinct resource, thread, user and session ids per bucket, with range totals from a second request. */
export function DistinctIdsCard(props: DistinctIdsCardProps) {
  useLocale();
  return (
    <TraceAggregateCard title={studioT(DISTINCT_IDS_TITLE)}>
      {scope => <DistinctIdsChart scope={scope} {...props} />}
    </TraceAggregateCard>
  );
}
