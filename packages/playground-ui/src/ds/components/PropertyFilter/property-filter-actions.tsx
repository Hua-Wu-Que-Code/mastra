import { Button } from '@/ds/components/Button/Button';
import { DropdownMenu } from '@/ds/components/DropdownMenu/dropdown-menu';
import { IconCrossMedium } from '@/ds/icons/central/IconCrossMedium';
import { IconDotGrid1x3Vertical } from '@/ds/icons/central/IconDotGrid1x3Vertical';
import { IconFloppyDisk1 } from '@/ds/icons/central/IconFloppyDisk1';
import { TrashIcon } from '@/ds/icons/TrashIcon';
import { t as studioT, useLocale } from '@/lib/i18n';

export type PropertyFilterActionsProps = {
  disabled?: boolean;
  /** Neutralize each pill's value (keep pills, clear values). Shown as a button, not a menu item. */
  onClear?: () => void;
  /** Fully remove all active filters. Rendered as "Remove all filters" inside the overflow menu. */
  onRemoveAll?: () => void;
  /** Persist the current filter set (typically to localStorage) for later restoration. */
  onSave?: () => void;
  /** Drop a previously-saved filter set. Wire only when a saved set actually exists. */
  onRemoveSaved?: () => void;
};

/**
 * Shared action bar for filter-driven pages (traces, logs, …). Renders a
 * Clear button and an overflow menu with Remove all / Save / Remove saved actions.
 */
export function PropertyFilterActions({
  disabled,
  onClear,
  onRemoveAll,
  onSave,
  onRemoveSaved,
}: PropertyFilterActionsProps) {
  useLocale();
  const hasMenuItems = !!(onRemoveAll || onSave || onRemoveSaved);
  if (!onClear && !hasMenuItems) return null;

  return (
    <div className="flex items-center gap-2">
      {onClear && (
        <Button disabled={disabled} size="md" onClick={onClear} icon={<IconCrossMedium />}>
          {studioT('Clear')}
        </Button>
      )}

      {hasMenuItems && (
        <DropdownMenu>
          <DropdownMenu.Trigger asChild>
            <Button disabled={disabled} size="icon-md" aria-label={studioT('More filter actions')}>
              <IconDotGrid1x3Vertical />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end">
            {onRemoveAll && (
              <DropdownMenu.Item onSelect={() => onRemoveAll()}>
                <IconCrossMedium />
                {studioT('Remove all filters')}
              </DropdownMenu.Item>
            )}
            {onRemoveAll && (onSave || onRemoveSaved) && <DropdownMenu.Separator />}
            {onSave && (
              <DropdownMenu.Item onSelect={() => onSave()}>
                <IconFloppyDisk1 />
                {studioT('Save filters for next time')}
              </DropdownMenu.Item>
            )}
            {onRemoveSaved && (
              <DropdownMenu.Item onSelect={() => onRemoveSaved()}>
                <TrashIcon />
                {studioT('Remove saved filters')}
              </DropdownMenu.Item>
            )}
          </DropdownMenu.Content>
        </DropdownMenu>
      )}
    </div>
  );
}
