import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { ActivityStatus } from '@/ds/components/ai/activity';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/ds/components/Collapsible';
import { DshChevronDown } from '@/ds/icons/dsh/DshChevronDown';
import { DshChevronUp } from '@/ds/icons/dsh/DshChevronUp';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const FADE_EDGE = 24;

/** A scrolling group body fades the edge that still has content beyond it, as DSH does. */
function useFadingEdges(active: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ top: false, bottom: false });
  useEffect(() => {
    const node = ref.current;
    if (!active || !node) return;
    const measure = () => {
      const top = node.scrollTop > 0.5;
      const bottom = node.scrollTop + node.clientHeight < node.scrollHeight - 0.5;
      setEdges(prev => (prev.top === top && prev.bottom === bottom ? prev : { top, bottom }));
    };
    measure();
    node.addEventListener('scroll', measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    if (node.firstElementChild) observer.observe(node.firstElementChild);
    return () => {
      node.removeEventListener('scroll', measure);
      observer.disconnect();
    };
  }, [active]);
  const style: CSSProperties & Record<`--${string}`, string> = {
    '--process-fade-top': edges.top ? `${FADE_EDGE}px` : '0px',
    '--process-fade-bottom': edges.bottom ? `${FADE_EDGE}px` : '0px',
  };
  return { ref, style };
}

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
  const fade = useFadingEdges(group && open);
  const rowClass = cn(
    'box-border flex min-w-0 flex-1 items-center gap-1.5 text-left font-normal',
    'min-h-[calc(24px+var(--dsh-content-font-delta,0px))] text-[length:var(--dsh-content-font-size-secondary,13px)]',
    // After the size: tailwind-merge drops an earlier `leading-*` when a font-size follows it.
    'leading-[calc(24px+var(--dsh-content-font-delta,0px))]',
    'transition-colors duration-100 motion-reduce:transition-none',
  );
  const headline = (
    <>
      <span
        data-process-slot=""
        className="relative flex size-[calc(16px+var(--dsh-content-font-delta,0px))] shrink-0 items-center justify-center [&_svg]:size-[calc(14px+var(--dsh-content-font-delta,0px))]"
      >
        <span
          className={cn(
            'flex transition-opacity duration-100 motion-reduce:transition-none',
            foldable && 'group-hover/process:opacity-0 group-focus-visible/process:opacity-0',
            open && foldable && 'opacity-0',
          )}
        >
          {icon}
        </span>
        {foldable && (
          <span
            data-process-chevron=""
            className={cn(
              'absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-100 motion-reduce:transition-none',
              open ? 'opacity-100' : 'group-hover/process:opacity-100 group-focus-visible/process:opacity-100',
            )}
          >
            {open ? <DshChevronUp /> : <DshChevronDown />}
          </span>
        )}
      </span>
      <span className="shrink-0 font-normal">{label}</span>
      {detail && (
        <>
          <span
            data-process-separator=""
            aria-hidden="true"
            className="mx-0.5 size-0.5 shrink-0 rounded-full bg-placeholder"
          />
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
      className={cn('min-w-0 text-muted-foreground', status === 'error' && 'text-destructive')}
    >
      <div className="flex min-w-0 items-center gap-1">
        {foldable ? (
          <CollapsibleTrigger
            aria-label={typeof label === 'string' ? label : undefined}
            className={cn('group/process', rowClass, group && 'data-[panel-open]:pb-2')}
          >
            {headline}
          </CollapsibleTrigger>
        ) : (
          <div className={rowClass}>{headline}</div>
        )}
        {trailing && <span className="flex shrink-0 items-center gap-1">{trailing}</span>}
      </div>
      {children && (
        <CollapsibleContent>
          {group ? (
            <div
              ref={fade.ref}
              data-process-body="group"
              style={fade.style}
              className="max-h-[min(400px,50vh)] overflow-y-auto overscroll-contain [mask-image:linear-gradient(to_bottom,transparent_0,#000_var(--process-fade-top,0px),#000_calc(100%-var(--process-fade-bottom,0px)),transparent_100%)]"
            >
              <div className="space-y-1">{children}</div>
            </div>
          ) : (
            <div className="min-w-0 py-1 pl-[calc(22px+var(--dsh-content-font-delta,0px))]">{children}</div>
          )}
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}
