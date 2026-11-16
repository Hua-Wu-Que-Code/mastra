import { Button } from '@mastra/playground-ui/components/Button';
import { EmptyState } from '@mastra/playground-ui/components/EmptyState';
import { IconSquareArrowTopRight } from '@mastra/playground-ui/icons/central/IconSquareArrowTopRight';
import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';

export const NoMCPServersInfo = () => {
  useLocale();
  return (
    <EmptyState
      titleSlot={studioT('No MCP Servers yet')}
      descriptionSlot={
        <>
          {studioT('MCP servers are not configured yet.') + ' '}
          <br />
          {studioT('More information in the documentation.')}
        </>
      }
      actionSlot={
        <Button
          variant="ghost"
          render={<a href="https://mastra.ai/docs/tools-mcp/mcp-overview" target="_blank" rel="noopener noreferrer" />}

          icon={<IconSquareArrowTopRight />}
        >
          {studioT('MCP documentation')}
        </Button>
      }
      variant="fill"
    />
  );
};
