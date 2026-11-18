import { AlertDialog } from '@mastra/playground-ui/components/AlertDialog';
import { DropdownMenu } from '@mastra/playground-ui/components/DropdownMenu';
import { ThreadListItem } from '@mastra/playground-ui/components/ThreadList';
import { Txt } from '@mastra/playground-ui/components/Txt';
import { useEntityRequestContext } from '@mastra/playground-ui/domains/request-context/hooks/use-entity-request-context';
import { IconDotGrid1x3Vertical } from '@mastra/playground-ui/icons/central/IconDotGrid1x3Vertical';
import { IconFolder1 } from '@mastra/playground-ui/icons/central/IconFolder1';
import { IconPencil } from '@mastra/playground-ui/icons/central/IconPencil';
import { IconPin } from '@mastra/playground-ui/icons/central/IconPin';
import { IconUnpin } from '@mastra/playground-ui/icons/central/IconUnpin';
import { TrashIcon } from '@mastra/playground-ui/icons/TrashIcon';
import { t } from '@mastra/playground-ui/lib/i18n';
import { formatDate } from '@mastra/playground-ui/utils/date-format';
import { toast } from '@mastra/playground-ui/utils/toast';
import { useDeleteThread } from '@mastra/react/hooks/memory';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import type { ConversationOrganization } from '../use-conversation-projects';
import type { SidebarThread } from '../use-sidebar-threads';
import { RenameThreadDialog } from '@/domains/agents/components/rename-thread-dialog';
import { usePermissions } from '@/domains/auth/hooks/use-permissions';

export function SidebarConversationRow({
  thread,
  organization,
  onNavigate,
}: {
  thread: SidebarThread;
  organization: ConversationOrganization;
  onNavigate: () => void;
}) {
  const [dialog, setDialog] = useState<'rename' | 'delete'>();
  const [requestContext] = useEntityRequestContext('agent', thread.agentId);
  const deletion = useDeleteThread({ requestContext });
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { canEdit, canDelete } = usePermissions();
  const url = `/agents/${encodeURIComponent(thread.agentId)}/threads/${encodeURIComponent(thread.id)}`;
  const pinned = organization.pinned.includes(thread.id);
  const project = organization.projects.find(p => p.threads.includes(thread.id));
  const title =
    thread.title && !/^New Thread \d{4}-/.test(thread.title)
      ? thread.title
      : formatDate(new Date(thread.createdAt), 'date-time-seconds');
  const remove = async () => {
    try {
      await deletion.mutateAsync({ threadId: thread.id, agentId: thread.agentId });
      organization.move(thread.id);
      if (pinned) organization.pin(thread.id);
      await queryClient.invalidateQueries({ queryKey: ['memory', 'threads', 'sidebar'] });
      if (pathname === url) void navigate(`/agents/${encodeURIComponent(thread.agentId)}/threads/new`);
      setDialog(undefined);
      toast.success(t('Chat deleted successfully'));
    } catch {
      toast.error(t('Failed to delete chat'));
    }
  };
  return (
    <>
      <ThreadListItem
        as={Link}
        to={url}
        isActive={pathname === url}
        onClick={onNavigate}
        actions={
          <DropdownMenu>
            <DropdownMenu.Trigger variant="ghost" size="icon-sm" aria-label={t('Thread actions')}>
              <IconDotGrid1x3Vertical />
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="end" finalFocus={false}>
              <DropdownMenu.Item onClick={() => organization.pin(thread.id)}>
                {pinned ? <IconUnpin /> : <IconPin />}
                {pinned ? t('Unpin') : t('Pin')}
              </DropdownMenu.Item>
              {canEdit('memory') && (
                <DropdownMenu.Item onClick={() => setDialog('rename')}>
                  <IconPencil />
                  {t('Rename')}
                </DropdownMenu.Item>
              )}
              {organization.projects
                .filter(p => p.id !== project?.id)
                .map(p => (
                  <DropdownMenu.Item key={p.id} onClick={() => organization.move(thread.id, p.id)}>
                    <IconFolder1 />
                    {p.name}
                  </DropdownMenu.Item>
                ))}
              {project && (
                <DropdownMenu.Item onClick={() => organization.move(thread.id)}>
                  {t('Move to recent')}
                </DropdownMenu.Item>
              )}
              {canDelete('memory') && (
                <DropdownMenu.Item variant="destructive" onClick={() => setDialog('delete')}>
                  <TrashIcon />
                  {t('Delete')}
                </DropdownMenu.Item>
              )}
            </DropdownMenu.Content>
          </DropdownMenu>
        }
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {pinned && <IconPin className="size-icon-xs shrink-0" />}
          <Txt as="span" variant="body-sm" className="block truncate" title={title}>
            {title}
          </Txt>
        </span>
      </ThreadListItem>
      {dialog === 'rename' && (
        <RenameThreadDialog
          agentId={thread.agentId}
          threadId={thread.id}
          initialTitle={thread.title ?? ''}
          onOpenChange={open => !open && setDialog(undefined)}
        />
      )}
      <AlertDialog open={dialog === 'delete'} onOpenChange={open => !open && setDialog(undefined)}>
        <AlertDialog.Content>
          <AlertDialog.Header>
            <AlertDialog.Title>{t('Are you absolutely sure?')}</AlertDialog.Title>
            <AlertDialog.Description>
              {t(
                'This action cannot be undone. This will permanently delete your chat and remove it from our servers.',
              )}
            </AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel disabled={deletion.isPending}>{t('Cancel')}</AlertDialog.Cancel>
            <AlertDialog.Action
              disabled={deletion.isPending}
              onClick={event => {
                event.preventDefault();
                event.preventBaseUIHandler();
                void remove();
              }}
            >
              {t('Continue')}
            </AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog>
    </>
  );
}
