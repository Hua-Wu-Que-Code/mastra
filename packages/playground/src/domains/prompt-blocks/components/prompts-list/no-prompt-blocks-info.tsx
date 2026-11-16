import { Button } from '@mastra/playground-ui/components/Button';
import { EmptyState } from '@mastra/playground-ui/components/EmptyState';
import { IconPlusMedium } from '@mastra/playground-ui/icons/central/IconPlusMedium';
import { IconSquareArrowTopRight } from '@mastra/playground-ui/icons/central/IconSquareArrowTopRight';
import { useLinkComponent } from '@mastra/playground-ui/lib/framework';
import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';

import { useIsCmsAvailable } from '@/domains/cms/hooks/use-is-cms-available';

export const NoPromptBlocksInfo = () => {
  useLocale();
  const { Link, paths } = useLinkComponent();
  const { isCmsAvailable, isLoading } = useIsCmsAvailable();
  const canCreate = !isLoading && isCmsAvailable;

  return (
    <EmptyState
      titleSlot={studioT('No Prompts yet')}
      descriptionSlot={
        canCreate ? (
          <>
            {studioT('Create a reusable prompt block and reference it') + ' '}
            <br />
            {studioT('in your agent instructions.')}
          </>
        ) : (
          <>
            {studioT('There are no prompt blocks yet. Prompt blocks are reusable') + ' '}
            <br />
            {studioT('content that can be referenced in your agent instructions.')}
          </>
        )
      }
      actionSlot={
        <div className="flex flex-col items-center gap-2">
          {canCreate && (
            <Button
              render={<Link href={paths.cmsPromptBlockCreateLink()} />}
              variant="primary"
              icon={<IconPlusMedium />}
            >
              {studioT('Create prompt')}
            </Button>
          )}
          <Button
            variant="ghost"
            render={
              <a
                href="https://mastra.ai/docs/editor/overview#prompt-blocks"
                target="_blank"
                rel="noopener noreferrer"
              />
            }

            icon={<IconSquareArrowTopRight />}
          >
            {studioT('Prompts documentation')}
          </Button>
        </div>
      }
      variant="fill"
    />
  );
};
