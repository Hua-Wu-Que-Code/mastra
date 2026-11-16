import { Button } from '@mastra/playground-ui/components/Button';
import { EmptyState } from '@mastra/playground-ui/components/EmptyState';
import { IconPlusMedium } from '@mastra/playground-ui/icons/central/IconPlusMedium';
import { IconSquareArrowTopRight } from '@mastra/playground-ui/icons/central/IconSquareArrowTopRight';
import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';

export interface NoDatasetsInfoProps {
  onCreateClick?: () => void;
}

export const NoDatasetsInfo = ({ onCreateClick }: NoDatasetsInfoProps = {}) => {
  useLocale();
  return (
    <EmptyState
      titleSlot={studioT('No Datasets yet')}
      descriptionSlot={
        <>
          {studioT('Create your first dataset to start evaluating') + ' '}
          <br />
          {studioT('your agents and workflows.')}
        </>
      }
      actionSlot={
        <div className="flex flex-col items-center gap-2">
          {onCreateClick && (
            <Button variant="primary" onClick={onCreateClick} icon={<IconPlusMedium />}>
              {studioT('New dataset')}
            </Button>
          )}
          <Button
            variant="ghost"
            render={<a href="https://mastra.ai/docs/evals/datasets" target="_blank" rel="noopener noreferrer" />}

            icon={<IconSquareArrowTopRight />}
          >
            {studioT('Datasets documentation')}
          </Button>
        </div>
      }
      variant="fill"
    />
  );
};
