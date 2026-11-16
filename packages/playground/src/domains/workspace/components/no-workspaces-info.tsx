import { Button } from '@mastra/playground-ui/components/Button';
import { EmptyState } from '@mastra/playground-ui/components/EmptyState';
import { IconSquareArrowTopRight } from '@mastra/playground-ui/icons/central/IconSquareArrowTopRight';
import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';

export const NoWorkspacesInfo = () => {
  useLocale();
  return (
    <EmptyState
      titleSlot={studioT('No Workspaces yet')}
      descriptionSlot={
        <>
          {studioT('Add a workspace to your Mastra configuration to') + ' '}
          <br />
          {studioT('manage files, skills, and enable semantic search.')}
        </>
      }
      actionSlot={
        <Button
          variant="ghost"
          render={<a href="https://mastra.ai/en/docs/workspace/overview" target="_blank" rel="noopener noreferrer" />}

          icon={<IconSquareArrowTopRight />}
        >
          {studioT('Workspaces documentation')}
        </Button>
      }
      variant="fill"
    />
  );
};
