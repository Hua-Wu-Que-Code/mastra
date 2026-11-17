import { useId } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import type { MetricsTableSortDirection } from './metrics-table-types';
import { IconArrowDown } from '@/ds/icons/central/IconArrowDown';
import { IconArrowUp } from '@/ds/icons/central/IconArrowUp';
import { cn } from '@/lib/utils';

const SORT_ICON = { asc: IconArrowUp, desc: IconArrowDown };

export const FOCUS =
  'focus-visible:outline-1 focus-visible:outline-solid focus-visible:outline-border-focus focus-visible:-outline-offset-1';

type HeaderTextProps = {
  header: string;
};

/** The header's label, as a sort button with the sorted direction's arrow. */
function SortButton({
  header,
  sorted,
  className,
  ...props
}: HeaderTextProps & { sorted?: MetricsTableSortDirection } & ComponentProps<'button'>) {
  const SortIcon = sorted && SORT_ICON[sorted];
  return (
    <button
      type="button"
      {...props}
      className={cn(
        'group/header flex items-center gap-1 rounded whitespace-nowrap hover:text-muted-foreground',
        FOCUS,
        className,
      )}
    >
      <span>{header}</span>
      {SortIcon && <SortIcon aria-hidden className="size-3" />}
    </button>
  );
}

/** Non-sortable headers stay plain text outside the keyboard tab order. */
function HeaderText({ header, className, ...props }: HeaderTextProps & ComponentProps<'span'>) {
  return (
    <span {...props} className={cn('group/header rounded whitespace-nowrap', FOCUS, className)}>
      <span>{header}</span>
    </span>
  );
}

/** Column labels keep their screen-reader description without a hover popup. */
export function MetricsTableHeaderLabel({
  header,
  description,
  sorted,
  onSort,
}: {
  header: string;
  description?: ReactNode;
  sorted?: MetricsTableSortDirection;
  /** Makes the header a sort button. */
  onSort?: () => void;
}) {
  const descriptionId = useId();
  const explained = Boolean(description);
  const describedBy = explained ? descriptionId : undefined;
  const trigger = onSort ? (
    <SortButton header={header} sorted={sorted} onClick={onSort} aria-describedby={describedBy} />
  ) : (
    <HeaderText header={header} aria-describedby={describedBy} />
  );

  return (
    <>
      {trigger}
      {explained && (
        <span id={descriptionId} className="sr-only">
          {description}
        </span>
      )}
    </>
  );
}
