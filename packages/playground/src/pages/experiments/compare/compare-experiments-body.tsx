import { Txt } from '@mastra/playground-ui/components/Txt';
import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';

import { CompareExperimentsContent } from './compare-experiments-content';
import { useComparedExperimentIds } from './use-compared-experiment-ids';

export function CompareExperimentsBody() {
  useLocale();
  const { datasetId, baselineId, contenderIds } = useComparedExperimentIds();

  if (!datasetId || !baselineId || contenderIds.length === 0) {
    return (
      <>
        <Txt as="h1" variant="heading" className="sr-only">
          {studioT('Compare')}
        </Txt>
        <div className="grid h-full min-w-min content-start items-start overflow-x-auto overflow-y-auto">
          <div className="py-5 text-center text-muted-foreground">
            <Txt as="p">{studioT('Select two to ten experiments to compare.')}</Txt>
            <Txt className="mt-2">
              {studioT('Use the URL format: /experiments/compare?dataset=')}
              {studioT('{datasetId}')}
              {studioT('&baseline=')}
              {studioT('{experimentId}')}
              {studioT('&contender=')}
              {studioT('{experimentId}')}
              {studioT('&contender=')}
              {studioT('{experimentId}')}
            </Txt>
          </div>
        </div>
      </>
    );
  }

  return <CompareExperimentsContent datasetId={datasetId} baselineId={baselineId} contenderIds={contenderIds} />;
}
