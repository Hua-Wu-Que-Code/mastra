import { Button } from '@mastra/playground-ui/components/Button';
import { EmptyState } from '@mastra/playground-ui/components/EmptyState';
import { IconSquareArrowTopRight } from '@mastra/playground-ui/icons/central/IconSquareArrowTopRight';
import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';

export const NoToolsInfo = () => {
  useLocale();
  return (
    <EmptyState
      titleSlot={studioT('No Tools yet')}
      descriptionSlot={
        <>
          {studioT('Mastra tools are not configured yet.') + ' '}
          <br />
          {studioT('More information in the documentation.')}
        </>
      }
      actionSlot={
        <Button
          variant="ghost"
          render={
            <a href="https://mastra.ai/docs/agents/using-tools-and-mcp" target="_blank" rel="noopener noreferrer" />
          }

          icon={<IconSquareArrowTopRight />}
        >
          {studioT('Tools documentation')}
        </Button>
      }
      variant="fill"
    />
  );
};
