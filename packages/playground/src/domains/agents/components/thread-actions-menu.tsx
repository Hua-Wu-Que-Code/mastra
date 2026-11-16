import { DropdownMenu } from '@mastra/playground-ui/components/DropdownMenu';
import { IconDotGrid1x3Vertical } from '@mastra/playground-ui/icons/central/IconDotGrid1x3Vertical';
import { IconPencil } from '@mastra/playground-ui/icons/central/IconPencil';
import { IconPin } from '@mastra/playground-ui/icons/central/IconPin';
import { IconUnpin } from '@mastra/playground-ui/icons/central/IconUnpin';
import { TrashIcon } from '@mastra/playground-ui/icons/TrashIcon';
import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';

export interface ThreadActionsMenuProps {
  onPin?: () => void;
  onUnpin?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
}

export const ThreadActionsMenu = ({ onPin, onUnpin, onRename, onDelete }: ThreadActionsMenuProps) => {
  useLocale();
  if (!onPin && !onUnpin && !onRename && !onDelete) return null;

  return (
    <DropdownMenu>
      <DropdownMenu.Trigger variant="ghost" size="icon-sm" aria-label={studioT('Thread actions')}>
        <IconDotGrid1x3Vertical />
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end" finalFocus={false}>
        {onPin && (
          <DropdownMenu.Item onClick={onPin}>
            <IconPin />
            {studioT('Pin')}
          </DropdownMenu.Item>
        )}
        {onUnpin && (
          <DropdownMenu.Item onClick={onUnpin}>
            <IconUnpin />
            {studioT('Unpin')}
          </DropdownMenu.Item>
        )}
        {onRename && (
          <DropdownMenu.Item onClick={onRename}>
            <IconPencil />
            {studioT('Rename')}
          </DropdownMenu.Item>
        )}
        {onDelete && (
          <DropdownMenu.Item variant="destructive" onClick={onDelete}>
            <TrashIcon />
            {studioT('Delete')}
          </DropdownMenu.Item>
        )}
      </DropdownMenu.Content>
    </DropdownMenu>
  );
};
