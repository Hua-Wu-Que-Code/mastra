import { Button } from '@/ds/components/Button';
import { IconCrossMedium } from '@/ds/icons/central/IconCrossMedium';
import { t as studioT, useLocale } from '@/lib/i18n';

export interface DataDetailsPanelCloseButtonProps {
  onClick: () => void;
  tooltip?: string;
  className?: string;
}

export function DataDetailsPanelCloseButton({
  onClick,
  tooltip = studioT('Close panel'),
  className,
}: DataDetailsPanelCloseButtonProps) {
  useLocale();
  return (
    <Button
      size="icon-md"
      onClick={onClick}
      aria-label={studioT('Close panel')}
      tooltip={tooltip}
      className={className}
    >
      <IconCrossMedium />
    </Button>
  );
}
