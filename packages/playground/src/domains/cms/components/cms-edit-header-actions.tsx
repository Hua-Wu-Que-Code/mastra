import { Badge } from '@mastra/playground-ui/components/Badge';

import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';
import type { ReactNode } from 'react';

export interface CmsEditHeaderActionsProps {
  hasDraft: boolean;
  children?: ReactNode;
}

/** Header actions for CMS edit pages: draft badge first, then the page's own controls. */
export function CmsEditHeaderActions({ hasDraft, children }: CmsEditHeaderActionsProps) {
  useLocale();
  return (
    <>
      {hasDraft && <Badge variant="info">{studioT('Unpublished changes')}</Badge>}
      {children}
    </>
  );
}
