import { Button } from '@mastra/playground-ui/components/Button';
import { EmptyState } from '@mastra/playground-ui/components/EmptyState';
import { IconSquareArrowTopRight } from '@mastra/playground-ui/icons/central/IconSquareArrowTopRight';
import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';

export const NoScorersInfo = () => {
  useLocale();
  return (
    <EmptyState
      titleSlot={studioT('No Scorers yet')}
      descriptionSlot={studioT('Configure scorers in code to get started. More info in the documentation.')}
      actionSlot={
        <Button
          variant="ghost"
          render={<a href="https://mastra.ai/docs/evals/overview" target="_blank" rel="noopener noreferrer" />}

          icon={<IconSquareArrowTopRight />}
        >
          {studioT('Scorers documentation')}
        </Button>
      }
      variant="fill"
    />
  );
};
