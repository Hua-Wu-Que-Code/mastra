import { Button } from '@/ds/components/Button';
import { IconArrowDown } from '@/ds/icons/central/IconArrowDown';
import { IconArrowUp } from '@/ds/icons/central/IconArrowUp';
import { t as studioT, useLocale } from '@/lib/i18n';

export type PrevNextNavProps = {
  onPrevious?: () => void;
  onNext?: () => void;
  previousAriaLabel?: string;
  nextAriaLabel?: string;
};

export function PrevNextNav({
  onPrevious,
  onNext,
  previousAriaLabel = studioT('Previous'),
  nextAriaLabel = studioT('Next'),
}: PrevNextNavProps) {
  useLocale();
  return (
    <div className="flex items-center gap-1">
      <Button onClick={onPrevious} disabled={!onPrevious} aria-label={previousAriaLabel} icon={<IconArrowUp />}>
        {studioT('Prev')}
      </Button>
      <Button onClick={onNext} disabled={!onNext} aria-label={nextAriaLabel} icon={<IconArrowDown />}>
        {studioT('Next')}
      </Button>
    </div>
  );
}
