import { Txt } from '@/ds/components/Txt';
import { t as studioT, useLocale } from '@/lib/i18n';

export interface DataPanelNoDataProps {
  children?: React.ReactNode;
}

export function DataPanelNoData({ children }: DataPanelNoDataProps) {
  useLocale();
  return (
    <Txt variant="caption" tone="faint" className="px-3 py-4">
      {children ?? studioT('No data found.')}
    </Txt>
  );
}
