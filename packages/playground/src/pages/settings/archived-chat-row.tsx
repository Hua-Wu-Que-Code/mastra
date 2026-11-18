import { Button } from '@mastra/playground-ui/components/Button';
import { Txt } from '@mastra/playground-ui/components/Txt';
import { useEntityRequestContext } from '@mastra/playground-ui/domains/request-context/hooks/use-entity-request-context';
import { TrashIcon } from '@mastra/playground-ui/icons/TrashIcon';
import { t } from '@mastra/playground-ui/lib/i18n';
import { SettingsItem } from '@mastra/playground-ui/new/settings';
import { formatDate } from '@mastra/playground-ui/utils/date-format';
import { toast } from '@mastra/playground-ui/utils/toast';
import { useState } from 'react';
import { Link } from 'react-router';
import { usePermissions } from '@/domains/auth/hooks/use-permissions';
import { ConversationDeleteDialog } from '@/domains/navigation/components/conversation-delete-dialog';
import type { ConversationOrganization } from '@/domains/navigation/use-conversation-projects';
import type { SidebarThread } from '@/domains/navigation/use-sidebar-threads';
import { useThreadArchive } from '@/domains/navigation/use-thread-archive';

export function ArchivedChatRow({
  thread,
  organization,
}: {
  thread: SidebarThread;
  organization: ConversationOrganization;
}) {
  const [requestContext] = useEntityRequestContext('agent', thread.agentId);
  const archive = useThreadArchive(requestContext);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { canEdit, canDelete } = usePermissions();
  const title = thread.title || formatDate(new Date(thread.createdAt), 'date-time-seconds');
  const restore = async () => {
    try {
      await archive.mutateAsync({ thread, archived: false });
      toast.success(t('Chat unarchived'));
    } catch {
      toast.error(t('Failed to unarchive chat'));
    }
  };
  return (
    <div role="listitem" aria-label={title}>
      <SettingsItem
        title={
          <Link to={`/chat/${encodeURIComponent(thread.agentId)}/threads/${encodeURIComponent(thread.id)}`}>
            {title}
          </Link>
        }
        description={formatDate(new Date(thread.updatedAt), 'date-time-seconds')}
      >
        {canEdit('memory') && (
          <Button
            size="sm"
            variant="ghost"
            disabled={archive.isPending || confirmDelete}
            onClick={() => void restore()}
          >
            {t('Unarchive')}
          </Button>
        )}
        {canDelete('memory') && (
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={t('Delete')}
            disabled={archive.isPending}
            onClick={() => setConfirmDelete(true)}
          >
            <TrashIcon />
          </Button>
        )}
      </SettingsItem>
      {archive.isError && <Txt role="alert">{t('Failed to unarchive chat')}</Txt>}
      {confirmDelete && (
        <ConversationDeleteDialog thread={thread} organization={organization} onClose={() => setConfirmDelete(false)} />
      )}
    </div>
  );
}
