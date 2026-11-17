import { useContext } from 'react';
import type { ReactNode } from 'react';
import { ComposerAttachmentContext } from './composer-attachment-context';
import { Txt } from '@/ds/components/Txt';

/** Preview content shares the composer's filename without duplicating it in each adapter. */
export function ComposerAttachmentEntry({
  children,
  name,
  variant = 'icon',
}: {
  children: ReactNode;
  name?: string;
  variant?: 'image' | 'icon';
}) {
  const composerName = useContext(ComposerAttachmentContext);
  const filename = composerName ?? name;

  if (variant === 'image') {
    return (
      <span className="size-full p-1">
        <span className="flex size-full items-center justify-center overflow-hidden rounded-[max(0px,calc(var(--attachment-radius,var(--radius-lg))-var(--spacing)))] [&_img]:size-full [&_img]:object-cover">
          {children}
        </span>
      </span>
    );
  }

  if (!filename) return children;

  return (
    <span className="flex size-full min-w-0 items-center gap-2 px-3">
      <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md [&_img]:size-full [&_img]:object-cover">
        {children}
      </span>
      <Txt as="span" variant="label" className="min-w-0 flex-1 truncate text-left">
        {filename}
      </Txt>
    </span>
  );
}
