import { Button } from '@/ds/components/Button';
import { EmptyState } from '@/ds/components/EmptyState';
import { IconSquareArrowTopRight } from '@/ds/icons/central/IconSquareArrowTopRight';
import { t as studioT, useLocale } from '@/lib/i18n';

export const NoWorkflowsInfo = () => {
  useLocale();
  return (
    <EmptyState
      titleSlot={studioT('No Workflows yet')}
      descriptionSlot={
        <>
          {studioT('Mastra workflows are not configured yet.') + ' '}
          <br />
          {studioT('More information in the documentation.')}
        </>
      }
      actionSlot={
        <Button
          variant="ghost"
          render={<a href="https://mastra.ai/docs/workflows/overview" target="_blank" rel="noopener noreferrer" />}

          icon={<IconSquareArrowTopRight />}
        >
          {studioT('Workflows documentation')}
        </Button>
      }
      variant="fill"
    />
  );
};
