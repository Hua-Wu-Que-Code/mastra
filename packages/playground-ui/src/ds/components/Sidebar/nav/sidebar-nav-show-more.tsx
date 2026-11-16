import type { ComponentProps } from 'react';
import type { SidebarState } from '../root/sidebar-context';
import { useMaybeSidebarState } from '../root/sidebar-context';
import { textStyle } from '@/ds/primitives/text';
import { focusRing } from '@/ds/primitives/transitions';

import { t as studioT, useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export type SidebarNavShowMoreProps = Omit<ComponentProps<'button'>, 'children' | 'onClick'> & {
  foldedCount: number;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  state?: SidebarState;
};

export function SidebarNavShowMore({
  foldedCount,
  expanded,
  onExpandedChange,
  state: stateProp,
  className,
  ...props
}: SidebarNavShowMoreProps) {
  useLocale();
  const context = useMaybeSidebarState();
  const state = stateProp ?? context?.state ?? 'default';
  if (state === 'collapsed' || foldedCount <= 0) return null;

  return (
    <button
      type="button"
      aria-expanded={expanded}
      onClick={() => onExpandedChange(!expanded)}
      className={cn(
        textStyle({ variant: 'caption', tone: 'muted' }),
        'self-start rounded-md pl-3 text-left hover:text-foreground',
        focusRing,
        className,
      )}
      {...props}
    >
      {expanded ? studioT('Show less') : studioT('Show {value0} more', { value0: foldedCount })}
    </button>
  );
}
