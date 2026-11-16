import { DataPanel } from '@mastra/playground-ui/components/DataPanel';

import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';
import { toast } from '@mastra/playground-ui/utils/toast';
import { useDatasetMutations, useScoresByExperimentId } from '@mastra/react/hooks/datasets';
import { useCallback, useMemo } from 'react';

import { ExperimentResultDetail } from '@/domains/experiments/components/experiment-result-detail';
import { useExperimentItemPanel } from '@/domains/experiments/context/experiment-item-panel-context';
import { useExperimentResultDetailState } from '@/domains/experiments/hooks/use-experiment-result-detail-state';

export interface ExperimentItemPanelProps {
  withQueryTrace: boolean;
  withFeedback: boolean;
  /** `drawer` (default) for a standalone overlay; `inline` when hosted in the route side panel. */
  variant?: 'drawer' | 'inline';
}

/**
 * Result panel for the `items/:itemId` child route. As a drawer, keep it mounted so it
 * animates in and out; `currentItemId` drives `open`. Inline, it renders only while an item is open.
 */
export function ExperimentItemPanel({ withQueryTrace, withFeedback, variant }: ExperimentItemPanelProps) {
  const studioLocale = useLocale();
  const {
    currentItemId: itemId,
    experimentId,
    datasetId,
    experimentStatus,
    results,
    isLoadingResults,
    hasNextPage,
    close,
    goToPreviousItem,
    goToNextItem,
  } = useExperimentItemPanel();

  const result = useMemo(() => (itemId ? results.find(r => r.itemId === itemId) : undefined), [results, itemId]);

  const { data: scoresByItemId } = useScoresByExperimentId({
    experimentId: experimentId,
    experimentStatus: experimentStatus,
    queryOptions: { enabled: Boolean(experimentId) },
  });
  const { updateExperimentResult } = useDatasetMutations();

  const flagForReview = useCallback(
    async (resultId: string) => {
      try {
        await updateExperimentResult.mutateAsync({ datasetId, experimentId, resultId, status: 'needs-review' });
        toast('Result flagged for review');
      } catch {
        toast.error(studioT('Failed to flag result for review'));
      }
    },
    [datasetId, experimentId, updateExperimentResult, studioLocale],
  );
  const completeResult = useCallback(
    async (resultId: string) => {
      try {
        await updateExperimentResult.mutateAsync({ datasetId, experimentId, resultId, status: 'complete' });
        toast('Result marked as reviewed');
      } catch {
        toast.error(studioT('Failed to complete result'));
      }
    },
    [datasetId, experimentId, updateExperimentResult, studioLocale],
  );

  const resultScores = result ? scoresByItemId?.[result.itemId] : undefined;
  const detailState = useExperimentResultDetailState(resultScores, result?.id);

  return (
    <ExperimentResultDetail
      variant={variant}
      result={result}
      itemId={itemId}
      fallback={
        isLoadingResults || hasNextPage ? (
          <DataPanel.LoadingData />
        ) : (
          <DataPanel.NoData>
            {studioT('No loaded result for item "')}
            {itemId}".
          </DataPanel.NoData>
        )
      }
      scores={resultScores}
      state={detailState}
      withQueryTrace={withQueryTrace}
      withFeedback={withFeedback}
      onPrevious={goToPreviousItem}
      onNext={goToNextItem}
      onClose={close}
      onComplete={result ? () => completeResult(result.id) : undefined}
      onFlagForReview={result ? () => void flagForReview(result.id) : undefined}
    />
  );
}
