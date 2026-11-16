import { Button } from '@mastra/playground-ui/components/Button';
import { EmptyState } from '@mastra/playground-ui/components/EmptyState';
import { IconSquareArrowTopRight } from '@mastra/playground-ui/icons/central/IconSquareArrowTopRight';
import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';

export const NoAgentsInfo = () => {
  useLocale();
  return (
    <EmptyState
      titleSlot={studioT('No Agents yet')}
      descriptionSlot={studioT('Configure agents in code to get started.')}
      actionSlot={
        <Button
          variant="ghost"
          render={<a href="https://mastra.ai/docs/agents/overview" target="_blank" rel="noopener noreferrer" />}

          icon={<IconSquareArrowTopRight />}
        >
          {studioT('Agents documentation')}
        </Button>
      }
      variant="fill"
    />
  );
};
