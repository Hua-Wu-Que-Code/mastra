import { Button } from '@mastra/playground-ui/components/Button';
import { EmptyState } from '@mastra/playground-ui/components/EmptyState';
import { IconSquareArrowTopRight } from '@mastra/playground-ui/icons/central/IconSquareArrowTopRight';
import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';

export const NoProcessorsInfo = () => {
  useLocale();
  return (
    <EmptyState
      titleSlot={studioT('No Processors yet')}
      descriptionSlot={studioT(
        'Configure processors. Add input or output processors to your agents to transform messages.',
      )}
      actionSlot={
        <Button
          variant="ghost"
          render={<a href="https://mastra.ai/docs/agents/processors" target="_blank" rel="noopener noreferrer" />}

          icon={<IconSquareArrowTopRight />}
        >
          {studioT('Processors documentation')}
        </Button>
      }
      variant="fill"
    />
  );
};
