import { Button } from '@/ds/components/Button';
import { IconArrowLeft } from '@/ds/icons/central/IconArrowLeft';
import { IconArrowRight } from '@/ds/icons/central/IconArrowRight';
import { t as studioT, useLocale } from '@/lib/i18n';
import { Trans } from '@/lib/i18n/trans';

export type DataListPaginationProps = {
  currentPage?: number;
  hasMore?: boolean;
  onNextPage?: () => void;
  onPrevPage?: () => void;
};

export function DataListPagination({ currentPage, hasMore, onNextPage, onPrevPage }: DataListPaginationProps) {
  useLocale();
  const showNavigation = (typeof currentPage === 'number' && currentPage > 0) || hasMore;

  return (
    <div className="col-span-full flex items-center justify-center gap-4 py-3 text-body text-muted-foreground">
      <span>
        <Trans id="Page {part0}" values={{ part0: <b>{currentPage ? currentPage + 1 : '1'}</b> }} />
      </span>
      {showNavigation && (
        <div className="flex gap-4">
          {typeof currentPage === 'number' && currentPage > 0 && (
            <Button type="button" size="sm" onClick={onPrevPage} icon={<IconArrowLeft />}>
              {studioT('Previous')}
            </Button>
          )}
          {hasMore && (
            <Button type="button" size="sm" onClick={onNextPage} icon={<IconArrowRight />}>
              {studioT('Next')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
