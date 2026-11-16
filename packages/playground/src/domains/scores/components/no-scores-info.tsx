import { Button } from '@mastra/playground-ui/components/Button';
import { EmptyState } from '@mastra/playground-ui/components/EmptyState';
import { IconPlusMedium } from '@mastra/playground-ui/icons/central/IconPlusMedium';
import { IconSquareArrowTopRight } from '@mastra/playground-ui/icons/central/IconSquareArrowTopRight';
import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';

export const NoScoresInfo = ({ onRunExperiment }: { onRunExperiment?: () => void }) => {
  useLocale();
  return (
    <EmptyState
      titleSlot={studioT('No scores yet')}
      descriptionSlot={studioT(
        'Scores will appear here once a scorer evaluates agents or workflows. More info in the documentation.',
      )}
      actionSlot={
        <div className="flex flex-col items-center gap-2">
          {onRunExperiment && (
            <Button variant="primary" onClick={onRunExperiment} icon={<IconPlusMedium />}>
              {studioT('New experiment')}
            </Button>
          )}
          <Button
            variant="ghost"
            render={<a href="https://mastra.ai/en/docs/evals/overview" target="_blank" rel="noopener noreferrer" />}

            icon={<IconSquareArrowTopRight />}
          >
            {studioT('Scorers documentation')}
          </Button>
        </div>
      }
      variant="fill"
    />
  );
};
