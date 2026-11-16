import { Button } from '@mastra/playground-ui/components/Button';
import { DropdownMenu } from '@mastra/playground-ui/components/DropdownMenu';
import { IconColumns3 } from '@mastra/playground-ui/icons/central/IconColumns3';

import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';
import { useCompareExperiments } from '@mastra/react/hooks/datasets';
import { useMemo } from 'react';
import type { CompareMetricKey } from './use-compare-metric-preferences';
import { useCompareMetricPreferences } from './use-compare-metric-preferences';
import { useObservabilityStorageCapabilities } from '@/domains/configuration/hooks/use-observability-storage-capabilities';

const RUN_METRICS: { key: CompareMetricKey; label: string; usage?: boolean }[] = [
  {
    key: 'cost',
    get label() {
      return studioT('Cost');
    },
    usage: true,
  },
  {
    key: 'duration',
    get label() {
      return studioT('Duration');
    },
  },
  {
    key: 'average',
    get label() {
      return studioT('Avg score');
    },
  },
  {
    key: 'tokens',
    get label() {
      return studioT('Tokens');
    },
    usage: true,
  },
  {
    key: 'errors',
    get label() {
      return studioT('Errors');
    },
  },
];

export interface CompareMetricsMenuProps {
  datasetId: string;
  baselineId: string;
  contenderIds: string[];
}

/** Picks which metrics the compare page shows. The choice is kept in localStorage. */
export function CompareMetricsMenu({ datasetId, baselineId, contenderIds }: CompareMetricsMenuProps) {
  useLocale();
  const experimentIds = useMemo(() => [baselineId, ...contenderIds], [baselineId, contenderIds]);
  // Same query as the grid, so React Query serves it from cache.
  const { data: comparison } = useCompareExperiments({ datasetId, experimentIds, baselineId });
  const { supportsMetrics } = useObservabilityStorageCapabilities();
  const { isHidden, toggle, reset } = useCompareMetricPreferences();

  const scorerIds = useMemo(
    () =>
      [
        ...new Set(
          (comparison?.items ?? []).flatMap(item =>
            Object.values(item.results).flatMap(result => (result ? Object.keys(result.scores) : [])),
          ),
        ),
      ].sort(),
    [comparison],
  );

  const runMetrics = RUN_METRICS.filter(metric => supportsMetrics || !metric.usage);

  return (
    <DropdownMenu>
      <DropdownMenu.Trigger
        render={
          <Button variant="ghost" size="md" icon={<IconColumns3 aria-hidden />}>
            {studioT('Metrics')}
          </Button>
        }
      />
      <DropdownMenu.Content align="end" className="min-w-56">
        <DropdownMenu.Label>{studioT('Run metrics')}</DropdownMenu.Label>
        {runMetrics.map(metric => (
          <DropdownMenu.CheckboxItem
            key={metric.key}
            checked={!isHidden(metric.key)}
            onCheckedChange={() => toggle(metric.key)}
          >
            {metric.label}
          </DropdownMenu.CheckboxItem>
        ))}
        {scorerIds.length > 0 && (
          <>
            <DropdownMenu.Separator />
            <DropdownMenu.Label>{studioT('Scorers')}</DropdownMenu.Label>
            {scorerIds.map(scorerId => {
              const key: CompareMetricKey = `scorer:${scorerId}`;
              return (
                <DropdownMenu.CheckboxItem key={key} checked={!isHidden(key)} onCheckedChange={() => toggle(key)}>
                  {scorerId}
                </DropdownMenu.CheckboxItem>
              );
            })}
          </>
        )}
        <DropdownMenu.Separator />
        <DropdownMenu.Item onSelect={reset}>{studioT('Show all metrics')}</DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}
