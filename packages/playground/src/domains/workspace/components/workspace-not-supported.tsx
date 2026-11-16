import { Button } from '@mastra/playground-ui/components/Button';
import { EmptyState } from '@mastra/playground-ui/components/EmptyState';
import { IconSquareArrowTopRight } from '@mastra/playground-ui/icons/central/IconSquareArrowTopRight';
import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';

export const WorkspaceNotSupported = () => {
  useLocale();
  return (
    <EmptyState
      titleSlot={studioT('Workspace Not Supported')}
      descriptionSlot={
        <>
          {studioT('The workspace feature requires a newer version of') + ' '}
          <code className="text-foreground">@mastra/core</code>.
          <br />
          {studioT('Please upgrade your dependencies to enable workspace functionality.')}
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
