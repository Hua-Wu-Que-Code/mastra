import { useState } from 'react';
import type { ReactNode } from 'react';
import type { ActivityStatus } from '@/ds/components/ai/activity';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/ds/components/Collapsible';
import { DshChevronDown } from '@/ds/icons/dsh/DshChevronDown';
import { DshChevronUp } from '@/ds/icons/dsh/DshChevronUp';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/** DSH DisclosureRow: leading glyph, one-line preview, independently expandable body. */
export function ProcessRow({
  icon,
  label,
  detail,
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  collapsible = true,
  status = 'idle',
  trailing,
  badges,
  group = false,
  ariaLabel,
}: {
  icon: ReactNode;
  label: ReactNode;
  detail?: string;
  children?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  collapsible?: boolean;
  status?: ActivityStatus;
  trailing?: ReactNode;
  badges?: ReactNode;
  group?: boolean;
  ariaLabel?: string;
}) {
  const [localOpen, setLocalOpen] = useState(defaultOpen);
  const foldable = collapsible && Boolean(children);
  const open = !collapsible || (controlledOpen ?? localOpen);
  const headline = (
    <>
      <span className="relative flex size-4 shrink-0 items-center justify-center [&_svg]:size-4">
        <span
          className={cn(
            'flex',
            foldable && 'group-hover/process:invisible group-focus-visible/process:invisible',
            open && foldable && 'invisible',
          )}
        >
          {icon}
        </span>
        {foldable && (
          <span
            className={cn(
              'absolute inset-0 invisible',
              open ? 'visible' : 'group-hover/process:visible group-focus-visible/process:visible',
            )}
          >
            {open ? <DshChevronUp /> : <DshChevronDown />}
          </span>
        )}
      </span>
      <span className="shrink-0 font-normal">{label}</span>
      {detail && (
        <>
          <span aria-hidden="true" className="mx-0.5 size-0.5 shrink-0 rounded-full bg-current" />
          <span className="min-w-0 flex-1 truncate text-left">{detail}</span>
        </>
      )}
      {badges}
      {status !== 'idle' && (
        <span className="sr-only" role="status">
          {status === 'error' ? t('Failed') : t('Working…')}
        </span>
      )}
    </>
  );
  return (
    <Collapsible
      open={open}
      onOpenChange={next => {
        setLocalOpen(next);
        onOpenChange?.(next);
      }}
      role="group"
      aria-label={ariaLabel ?? (typeof label === 'string' ? label : undefined)}
      data-process-row=""
      data-process-label={typeof label === 'string' ? label : undefined}
      className={cn('min-w-0 text-caption text-muted-foreground', status === 'error' && 'text-destructive')}
    >
      <div className="flex min-w-0 items-center gap-1">
        {foldable ? (
          <CollapsibleTrigger
            aria-label={typeof label === 'string' ? label : undefined}
            className="group/process flex min-h-6 min-w-0 flex-1 items-center gap-1.5 py-1 text-left font-normal"
          >
            {headline}
          </CollapsibleTrigger>
        ) : (
          <div className="flex min-h-6 min-w-0 flex-1 items-center gap-1.5 py-1">{headline}</div>
        )}
        {trailing && <span className="flex shrink-0 items-center gap-1">{trailing}</span>}
      </div>
      {children && (
        <CollapsibleContent>
          <div
            className={group ? 'max-h-96 space-y-1 overflow-y-auto overscroll-contain py-1' : 'min-w-0 py-1 pl-[22px]'}
          >
            {children}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}
