import { DropdownMenu } from '@mastra/playground-ui/components/DropdownMenu';
import { ThreadListItem } from '@mastra/playground-ui/components/ThreadList';
import { Txt } from '@mastra/playground-ui/components/Txt';
import { useEntityRequestContext } from '@mastra/playground-ui/domains/request-context/hooks/use-entity-request-context';
import { IconArchive } from '@mastra/playground-ui/icons/central/IconArchive';
import { IconDotGrid1x3Vertical } from '@mastra/playground-ui/icons/central/IconDotGrid1x3Vertical';
import { IconFolder1 } from '@mastra/playground-ui/icons/central/IconFolder1';
import { IconFork } from '@mastra/playground-ui/icons/central/IconFork';
import { IconPencil } from '@mastra/playground-ui/icons/central/IconPencil';
import { IconPin } from '@mastra/playground-ui/icons/central/IconPin';
import { IconUnpin } from '@mastra/playground-ui/icons/central/IconUnpin';
import { TrashIcon } from '@mastra/playground-ui/icons/TrashIcon';
import { t } from '@mastra/playground-ui/lib/i18n';
import { formatDate } from '@mastra/playground-ui/utils/date-format';
import { toast } from '@mastra/playground-ui/utils/toast';
import { useCloneThread } from '@mastra/react/hooks/memory';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import type { ConversationOrganization } from '../use-conversation-projects';
import type { SidebarThread } from '../use-sidebar-threads';
import { useThreadArchive } from '../use-thread-archive';
import { ConversationDeleteDialog } from './conversation-delete-dialog';
import { ConversationSpinner } from './conversation-spinner';
import { RenameThreadDialog } from '@/domains/agents/components/rename-thread-dialog';
import { usePermissions } from '@/domains/auth/hooks/use-permissions';

export function SidebarConversationRow({
  thread,
  organization,
  onNavigate,
  running = false,
}: {
  thread: SidebarThread;
  organization: ConversationOrganization;
  onNavigate: () => void;
  running?: boolean;
}) {
  const [dialog, setDialog] = useState<'rename' | 'delete'>();
  const [requestContext] = useEntityRequestContext('agent', thread.agentId);
  const archive = useThreadArchive(requestContext);
  const queries = useQueryClient();
  const clone = useCloneThread({ requestContext });
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { canEdit, canDelete } = usePermissions();
  const url = `/chat/${encodeURIComponent(thread.agentId)}/threads/${encodeURIComponent(thread.id)}`;
  const isActive =
    pathname === url ||
    pathname === `/agents/${encodeURIComponent(thread.agentId)}/threads/${encodeURIComponent(thread.id)}`;
  const pinned = organization.pinned.includes(thread.id);
  const project = organization.projects.find(p => p.threads.includes(thread.id));
  const title =
    thread.title && !/^New Thread \d{4}-/.test(thread.title)
      ? thread.title
      : formatDate(new Date(thread.createdAt), 'date-time-seconds');
  const archiveThread = async () => {
    try {
      await archive.mutateAsync({ thread, archived: true });
      if (isActive) void navigate(`/chat/${encodeURIComponent(thread.agentId)}/threads/new`);
      toast.success(t('Chat archived'));
    } catch {
      toast.error(t('Failed to archive chat'));
    }
  };
  const cloneThread = async () => {
    try {
      const result = await clone.mutateAsync({ threadId: thread.id, agentId: thread.agentId });
      await queries.invalidateQueries({ queryKey: ['memory', 'threads'] });
      void navigate(`/chat/${encodeURIComponent(thread.agentId)}/threads/${encodeURIComponent(result.thread.id)}`);
      onNavigate();
      toast.success(t('Thread cloned successfully'));
    } catch {
      toast.error(t('Failed to clone thread'));
    }
  };
  return (
    <>
      <ThreadListItem
        as={Link}
        to={url}
        isActive={isActive}
        onClick={onNavigate}
        actions={
          <DropdownMenu>
            <DropdownMenu.Trigger variant="ghost" size="icon-sm" aria-label={t('Thread actions')}>
              <IconDotGrid1x3Vertical />
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="end" finalFocus={false}>
              <DropdownMenu.Item onClick={() => void organization.pin(thread.id).catch(() => {})}>
                {pinned ? <IconUnpin /> : <IconPin />}
                {pinned ? t('Unpin') : t('Pin')}
              </DropdownMenu.Item>
              {canEdit('memory') && (
                <DropdownMenu.Item onClick={() => setDialog('rename')}>
                  <IconPencil />
                  {t('Rename')}
                </DropdownMenu.Item>
              )}
              {canEdit('memory') && (
                <DropdownMenu.Item disabled={clone.isPending} onClick={() => void cloneThread()}>
                  <IconFork />
                  {t('Clone chat')}
                </DropdownMenu.Item>
              )}
              {organization.projects.some(p => p.id !== project?.id) && (
                <DropdownMenu.Sub>
                  <DropdownMenu.SubTrigger>
                    <IconFolder1 />
                    {t('Move to project')}
                  </DropdownMenu.SubTrigger>
                  <DropdownMenu.SubContent>
                    {organization.projects
                      .filter(p => p.id !== project?.id)
                      .map(p => (
                        <DropdownMenu.Item
                          key={p.id}
                          onClick={() => void organization.move(thread.id, p.id).catch(() => {})}
                        >
                          <IconFolder1 />
                          {p.name}
                        </DropdownMenu.Item>
                      ))}
                  </DropdownMenu.SubContent>
                </DropdownMenu.Sub>
              )}
              {project && (
                <DropdownMenu.Item onClick={() => void organization.move(thread.id).catch(() => {})}>
                  {t('Move to recent')}
                </DropdownMenu.Item>
              )}
              {canEdit('memory') && (
                <DropdownMenu.Item disabled={archive.isPending} onClick={() => void archiveThread()}>
                  <IconArchive />
                  {t('Archive')}
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
          {running && <ConversationSpinner />}
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
      {archive.isError && <Txt role="alert">{t('Failed to archive chat')}</Txt>}
      {clone.isError && <Txt role="alert">{t('Failed to clone thread')}</Txt>}
      {dialog === 'delete' && (
        <ConversationDeleteDialog
          thread={thread}
          organization={organization}
          onClose={() => setDialog(undefined)}
          onDeleted={() => {
            if (isActive) void navigate(`/chat/${encodeURIComponent(thread.agentId)}/threads/new`);
          }}
        />
      )}
    </>
  );
}
