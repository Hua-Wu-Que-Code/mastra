import { Button } from '@/ds/components/Button';
import { Txt } from '@/ds/components/Txt';
import { IconChevronLeftMedium } from '@/ds/icons/central/IconChevronLeftMedium';
import { IconChevronRightMedium } from '@/ds/icons/central/IconChevronRightMedium';
import { t as studioT, useLocale } from '@/lib/i18n';
import { Trans } from '@/lib/i18n/trans';

export const EXAMPLES_PAGE_SIZE = 5;

/** Numbered pager for detail-panel example lists — page count derives from the theme's trace count. */
export function ExamplesPager({
  traceCount,
  offset,
  onOffsetChange,
}: {
  traceCount: number;
  offset: number;
  onOffsetChange: (offset: number) => void;
}) {
  useLocale();
  const totalPages = Math.max(1, Math.ceil(traceCount / EXAMPLES_PAGE_SIZE));
  const page = Math.floor(offset / EXAMPLES_PAGE_SIZE) + 1;
  if (totalPages <= 1) return null;

  return (
    <nav aria-label={studioT('Example pages')} className="mt-3 flex items-center gap-3">
      <Button
        icon={<IconChevronLeftMedium />}
        size="sm"
        disabled={page <= 1}
        onClick={() => onOffsetChange((page - 2) * EXAMPLES_PAGE_SIZE)}
      >
        {studioT('Previous')}
      </Button>
      <Txt as="span" variant="caption" tone="muted" className="tabular-nums">
        <Trans id="Page {part0} of {part1}" values={{ part0: page, part1: totalPages }} />
      </Txt>
      <Button
        icon={<IconChevronRightMedium />}
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onOffsetChange(page * EXAMPLES_PAGE_SIZE)}
      >
        {studioT('Next')}
      </Button>
    </nav>
  );
}
