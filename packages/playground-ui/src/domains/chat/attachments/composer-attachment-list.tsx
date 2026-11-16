import type { ComponentProps } from 'react';
import { ComposerAttachments } from '@/ds/components/Composer';
import { ScrollArea } from '@/ds/components/ScrollArea';

import { t as studioT, useLocale } from '@/lib/i18n';
import { cn } from '@/utils/cn';

export function ComposerAttachmentList({ className, ...props }: ComponentProps<typeof ComposerAttachments>) {
  useLocale();
  return (
    <ScrollArea orientation="horizontal" mask={false} data-slot="composer-attachment-scroll-area">
      <ComposerAttachments
        aria-label={studioT('Draft attachments')}
        className={cn('flex max-w-none items-center gap-3 p-2', className)}
        {...props}
      />
    </ScrollArea>
  );
}
