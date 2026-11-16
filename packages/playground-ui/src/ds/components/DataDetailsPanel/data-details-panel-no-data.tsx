import { Txt } from '@/ds/components/Txt';
import { t as studioT, useLocale } from '@/lib/i18n';

export interface DataDetailsPanelNoDataProps {
  children?: React.ReactNode;
}

export function DataDetailsPanelNoData({ children }: DataDetailsPanelNoDataProps) {
  useLocale();
  return (
    <Txt variant="caption" tone="faint" className="px-4 py-6">
      {children ?? studioT('No data found.')}
    </Txt>
  );
}
