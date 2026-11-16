import { EmptyState } from '@/ds/components/EmptyState';
import type { EmptyStateProps } from '@/ds/components/EmptyState';
import { IconLock } from '@/ds/icons/central/IconLock';
import { useLocale, t as studioT } from '@/lib/i18n';

export type PermissionDeniedProps = {
  resource: string;
  variant?: EmptyStateProps['variant'];
};

export function PermissionDenied({ resource, variant }: PermissionDeniedProps) {
  useLocale();
  return (
    <EmptyState
      variant={variant}
      iconSlot={<IconLock />}
      titleSlot={studioT('Permission Denied')}
      descriptionSlot={studioT("You don't have permission to access {value0}. Contact your administrator for access.", {
        value0: resource,
      })}
    />
  );
}
