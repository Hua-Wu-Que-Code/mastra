import { Button } from '@/ds/components/Button';
import type { ButtonProps } from '@/ds/components/Button';
import { IconArrowDown } from '@/ds/icons/central/IconArrowDown';
import { IconArrowUp } from '@/ds/icons/central/IconArrowUp';
import { t as studioT, useLocale } from '@/lib/i18n';

export interface DataPanelNextPrevNavProps {
  onPrevious?: () => void;
  onNext?: () => void;
  previousLabel?: string;
  nextLabel?: string;
  variant?: ButtonProps['variant'];
}

/** Two independent previous/next buttons, laid out by the parent `HeaderActions` gap. */
export function DataPanelNextPrevNav({
  onPrevious,
  onNext,
  previousLabel = studioT('Go to previous'),
  nextLabel = studioT('Go to next'),
  variant = 'ghost',
}: DataPanelNextPrevNavProps) {
  useLocale();
  return (
    <>
      <Button size="icon-sm" variant={variant} tooltip={previousLabel} onClick={onPrevious} disabled={!onPrevious}>
        <IconArrowUp />
      </Button>
      <Button size="icon-sm" variant={variant} tooltip={nextLabel} onClick={onNext} disabled={!onNext}>
        <IconArrowDown />
      </Button>
    </>
  );
}
