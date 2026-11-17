import type { MastraDBMessage } from '@mastra/core/agent/message-list';
import { Button } from '@mastra/playground-ui/components/Button';
import { isToolPart, readToolPart } from '@mastra/playground-ui/domains/chat/messages/renderers/tool-part';
import { isSettledState } from '@mastra/playground-ui/domains/chat/tools/tool-card-kind';
import { useEntityRequestContext } from '@mastra/playground-ui/domains/request-context/hooks/use-entity-request-context';
import { DshBranch } from '@mastra/playground-ui/icons/dsh/DshBranch';
import { useLinkComponent } from '@mastra/playground-ui/lib/framework';
import { t, useLocale } from '@mastra/playground-ui/lib/i18n';
import { useMastraClient } from '@mastra/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { usePermissions } from '@/domains/auth/hooks/use-permissions';

/** DSH forks at a durable message boundary, retaining every earlier page of history. */
export function BranchMessageAction({
  agentId,
  threadId,
  messageId,
  messages,
}: {
  agentId: string;
  threadId: string;
  messageId: string;
  messages: MastraDBMessage[];
}) {
  useLocale();
  const client = useMastraClient();
  const queryClient = useQueryClient();
  const { paths, navigate } = useLinkComponent();
  const { canEdit } = usePermissions();
  const [requestContext] = useEntityRequestContext('agent', agentId);
  const mutation = useMutation({
    mutationFn: async () => {
      const source = client.getMemoryThread({ threadId, agentId });
      const ids: string[] = [];
      for (let page = 0; ; page++) {
        const result = await source.listMessages({
          page,
          perPage: 100,
          orderBy: { field: 'createdAt', direction: 'ASC' },
          requestContext,
        });
        for (const message of result.messages) {
          ids.push(message.id);
          if (message.id !== messageId) continue;
          return source.clone({ options: { messageFilter: { messageIds: ids } }, requestContext });
        }
        if (!result.hasMore || result.messages.length === 0)
          throw new Error('Branch boundary is no longer in thread history');
      }
    },
    onSuccess: result => {
      void queryClient.invalidateQueries({ queryKey: ['memory', 'threads'] });
      navigate(paths.agentThreadLink(agentId, result.thread.id));
    },
    onError: () => toast.error(t('Failed to branch conversation')),
  });
  const unfinished = messages.some(message =>
    message.content.parts.some(part => {
      if (!isToolPart(part)) return false;
      const tool = readToolPart(part);
      return tool.backgroundTaskStatus === 'running' || (!isSettledState(tool.state) && tool.state !== 'output-error');
    }),
  );
  if (!canEdit('memory')) return null;
  return (
    <Button
      size="icon-sm"
      variant="ghost"
      aria-label={t('Branch conversation')}
      disabled={mutation.isPending || unfinished}
      onClick={() => mutation.mutate()}
    >
      <DshBranch />
    </Button>
  );
}
