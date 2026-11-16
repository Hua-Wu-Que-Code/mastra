import type { ReactNode } from 'react';
import { Spinner } from '@/ds/components/Spinner';
import { t as studioT, useLocale } from '@/lib/i18n';

export interface DataDetailsPanelLoadingDataProps {
  children?: ReactNode;
}

export function DataDetailsPanelLoadingData({ children }: DataDetailsPanelLoadingDataProps) {
  useLocale();
  return (
    <div className="flex items-center justify-center gap-2 px-4 py-6 text-caption text-muted-foreground">
      <Spinner size="sm" variant="pulse" className="text-muted-foreground" /> {children ?? studioT('Loading...')}
    </div>
  );
}
