import { Icon } from '@/ds/icons/Icon';
import { controlSizeClasses } from '@/ds/primitives/control-size';
import { controlStateColorTransition, transitions } from '@/ds/primitives/transitions';
import { quietTextHover } from '@/ds/primitives/typography';
import { cn } from '@/lib/utils';

export interface DataPanelMetadataProps {
  children: React.ReactNode;
}

/** Row of `Meta` pills next to a `DataPanel.Heading`. Never wraps; overflowing pills are clipped. */
export function DataPanelMetadata({ children }: DataPanelMetadataProps) {
  return <ul className="flex min-w-0 flex-nowrap items-center gap-0.5 overflow-hidden">{children}</ul>;
}

export interface DataPanelMetaProps extends Omit<React.HTMLAttributes<HTMLElement>, 'children' | 'title'> {
  /** Element/component to render as (e.g. a router `Link`). Defaults to `span`. */
  as?: React.ElementType;
  href?: string;
  to?: string;
  /** Prefix icon (bare SVG). */
  icon?: React.ReactNode;
  /** Accessible name for static metadata; hover hints are disabled. */
  tooltip?: React.ReactNode;
  children: React.ReactNode;
  'data-testid'?: string;
}

export function DataPanelMeta({ as, icon, tooltip, children, className, ...props }: DataPanelMetaProps) {
  const Root = as ?? 'span';
  const isInteractive = Boolean(as || props.href || props.to || props.onClick);

  const root = (
    <Root
      aria-label={!isInteractive && typeof tooltip === 'string' ? tooltip : undefined}
      className={cn(
        // Same box as a `size="sm"` ghost `Button` (e.g. `TraceIdButton`), so pills line up
        // with the heading and the trace ID on the same header row.
        'inline-flex min-w-0 items-center gap-1.5 overflow-hidden rounded-full px-2',
        controlSizeClasses.sm,
        controlStateColorTransition,
        isInteractive
          ? cn(quietTextHover, 'cursor-pointer hover:bg-fill-subtle active:bg-fill')
          : 'text-muted-foreground',
        className,
      )}
      {...props}
    >
      {icon && (
        <Icon size="xs" className={cn('shrink-0 opacity-50 group-hover:opacity-100', transitions.opacity)}>
          {icon}
        </Icon>
      )}
      <span className="min-w-0 truncate">{children}</span>
    </Root>
  );

  return <li className="group flex h-control-sm min-w-0 shrink-0 items-center">{root}</li>;
}
