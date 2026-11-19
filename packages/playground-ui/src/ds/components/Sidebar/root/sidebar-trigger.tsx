import { useSidebar } from './sidebar-context';
import { Button } from '@/ds/components/Button';
import type { ButtonProps } from '@/ds/components/Button';
import { ShortcutHint } from '@/ds/components/Kbd/shortcut-hint';
import { IconSidebarSimpleLeftWide } from '@/ds/icons/central/IconSidebarSimpleLeftWide';

import { t as studioT, useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export type SidebarTriggerProps = Omit<ButtonProps, 'variant' | 'size' | 'tooltip' | 'children'>;

export function SidebarTrigger({ className, onClick, ...props }: SidebarTriggerProps) {
  useLocale();
  const { desktopState, isMobile, toggleSidebar } = useSidebar();
  const isCollapsed = desktopState === 'collapsed';

  if (isMobile) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={studioT('Toggle sidebar')}
      aria-expanded={!isCollapsed}
      tooltip={<ShortcutHint label={studioT('Toggle sidebar')} shortcut="[" />}
      tooltipPosition="bottom"
      {...props}
      onClick={event => {
        onClick?.(event);
        if (!event.defaultPrevented) toggleSidebar();
      }}
      className={cn('shrink-0', !isCollapsed && 'ml-auto', className)}
    >
      <IconSidebarSimpleLeftWide />
    </Button>
  );
}
