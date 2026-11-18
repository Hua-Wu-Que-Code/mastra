import { AlertDialog } from '@mastra/playground-ui/components/AlertDialog';
import { t } from '@mastra/playground-ui/lib/i18n';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router';
import type { ConversationProject } from '../use-conversation-projects';
import { useConversationProjects } from '../use-conversation-projects';
import { useConversationScope } from '../use-conversation-scope';

export function ProjectDeleteDialog({
  project,
  agentId,
  onClose,
}: {
  project: ConversationProject;
  agentId: string;
  onClose: () => void;
}) {
  const scope = useConversationScope();
  const organization = useConversationProjects(scope);
  const queries = useQueryClient();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const deletion = useMutation({
    mutationFn: async () => {
      await organization.remove(project.id);
      await queries.invalidateQueries({ queryKey: ['memory', 'threads'] });
      if (
        project.threads.some(id => pathname.endsWith(`/threads/${encodeURIComponent(id)}`)) ||
        pathname.endsWith(`/projects/${encodeURIComponent(project.id)}`) ||
        new URLSearchParams(search).get('project') === project.id
      ) {
        void navigate(`/chat/${encodeURIComponent(agentId)}/threads/new`, { replace: true });
      }
      onClose();
    },
    retry: false,
  });
  return (
    <AlertDialog open onOpenChange={open => !open && !deletion.isPending && onClose()}>
      <AlertDialog.Content>
        <AlertDialog.Header>
          <AlertDialog.Title>{t('Delete project')}</AlertDialog.Title>
          <AlertDialog.Description>
            {t('Permanently delete “{name}” and all its chats? This cannot be undone.', { name: project.name })}
          </AlertDialog.Description>
        </AlertDialog.Header>
        {deletion.isError && <p role="alert">{deletion.error.message}</p>}
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
            {t('Delete project')}
          </AlertDialog.Action>
        </AlertDialog.Footer>
      </AlertDialog.Content>
    </AlertDialog>
  );
}
