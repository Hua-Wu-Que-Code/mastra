import { AlertDialog } from '@mastra/playground-ui/components/AlertDialog';
import { useEntityRequestContext } from '@mastra/playground-ui/domains/request-context/hooks/use-entity-request-context';
import { t } from '@mastra/playground-ui/lib/i18n';
import { is404NotFoundError } from '@mastra/playground-ui/utils/errors';
import { toast } from '@mastra/playground-ui/utils/toast';
import { useDeleteThread } from '@mastra/react/hooks/memory';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ConversationOrganization } from '../use-conversation-projects';
import type { SidebarThread } from '../use-sidebar-threads';

export function ConversationDeleteDialog({
  thread,
  organization,
  onClose,
  onDeleted,
}: {
  thread: SidebarThread;
  organization: ConversationOrganization;
  onClose: () => void;
  onDeleted?: () => void;
}) {
  const [requestContext] = useEntityRequestContext('agent', thread.agentId);
  const deleteThread = useDeleteThread({
    requestContext,
    // Refresh after both deletion and organization cleanup, so a failed cleanup stays retryable.
    queryOptions: { onSuccess: () => {} },
  });
  const queryClient = useQueryClient();
  const deletion = useMutation({
    mutationFn: async () => {
      try {
        await deleteThread.mutateAsync({ threadId: thread.id, agentId: thread.agentId });
      } catch (error) {
        // A retry may follow a successful delete whose metadata cleanup failed.
        if (!is404NotFoundError(error)) throw error;
      }
      await organization.forget(thread.id);
      await queryClient.invalidateQueries({ queryKey: ['memory', 'threads'] });
      onDeleted?.();
      onClose();
      toast.success(t('Chat deleted successfully'));
    },
    onError: () => toast.error(t('Failed to delete chat')),
    retry: false,
  });
  return (
    <AlertDialog open onOpenChange={open => !open && !deletion.isPending && onClose()}>
      <AlertDialog.Content>
        <AlertDialog.Header>
          <AlertDialog.Title>{t('Are you absolutely sure?')}</AlertDialog.Title>
          <AlertDialog.Description>
            {t('This action cannot be undone. This will permanently delete your chat and remove it from our servers.')}
          </AlertDialog.Description>
        </AlertDialog.Header>
        {deletion.isError && <p role="alert">{t('Failed to delete chat')}</p>}
        <AlertDialog.Footer>
          <AlertDialog.Cancel disabled={deletion.isPending}>{t('Cancel')}</AlertDialog.Cancel>
          <AlertDialog.Action
            disabled={deletion.isPending}
            onClick={event => {
              event.preventDefault();
              event.preventBaseUIHandler();
              deletion.mutate();
            }}
          >
            {t('Continue')}
          </AlertDialog.Action>
        </AlertDialog.Footer>
      </AlertDialog.Content>
    </AlertDialog>
  );
}
