import type { ReactNode } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/ds/components/Popover';
import { Txt } from '@/ds/components/Txt';

/** DSH's compact click card, using Studio's shared focus, portal and collision handling. */
export function StatCard({
  icon,
  label,
  title,
  heading,
  value,
  children,
  open,
  onOpenChange,
}: {
  icon: ReactNode;
  label: ReactNode;
  title: string;
  heading?: ReactNode;
  value?: ReactNode;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        size="sm"
        variant="ghost"
        className="h-auto min-h-6 gap-1.5 rounded-md px-2 py-1 font-normal text-muted-foreground [&_svg]:size-3.5"
        aria-label={title}
      >
        {icon}
        <span>{label}</span>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={8}
        aria-label={title}
        className="max-h-[min(24rem,calc(100dvh-2rem))] w-80 max-w-[calc(100vw-1.5rem)] overflow-y-auto p-4"
      >
        <div className="mb-3 flex items-center justify-between gap-4 border-b border-border pb-3">
          <Txt variant="label" as="span" className="inline-flex items-center gap-1.5 [&_svg]:size-3.5">
            {heading ?? (
              <>
                {icon}
                {title}
              </>
            )}
          </Txt>
          {value !== undefined && (
            <Txt variant="caption" as="span" className="shrink-0 tabular-nums">
              {value}
            </Txt>
          )}
        </div>
        {children}
      </PopoverContent>
    </Popover>
  );
}

export function StatRows({ rows }: { rows: { label: string; value: ReactNode; icon?: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 text-caption text-muted-foreground">
      {rows.map(row => (
        <div key={row.label} className="contents">
          <dt className="flex items-center gap-2">
            {row.icon}
            {row.label}
          </dt>
          <dd className="text-right tabular-nums">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
