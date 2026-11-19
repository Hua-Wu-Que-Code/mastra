import { useChatMessages } from '@mastra/playground-ui/domains/chat/context/chat-context';
import { useMastraClient } from '@mastra/react';
import { useQuery } from '@tanstack/react-query';
import { conversationFilePaths, loadConversationFilePaths } from './conversation-file-paths';
import { useAccount } from '@/domains/account/account-context';
import { useStudioConfig } from '@/domains/configuration/context/studio-config-state';

export function useConversationFilePaths({
  agentId,
  threadId,
  requestContext,
}: {
  agentId?: string;
  threadId?: string;
  requestContext?: Record<string, unknown>;
}) {
  const target = useStudioConfig();
  const account = useAccount();
  const client = useMastraClient();
  const messages = useChatMessages();
  const history = useQuery({
    queryKey: [
      'conversation-file-paths',
      target.baseUrl,
      target.headers,
      account?.user.id,
      agentId,
      threadId,
      requestContext,
    ],
    queryFn: ({ signal }) => loadConversationFilePaths(client, agentId!, threadId!, requestContext, signal),
    enabled: Boolean(agentId && threadId && target.baseUrl),
    staleTime: 60_000,
    retry: false,
  });
  return { history, paths: [...new Set([...(history.data ?? []), ...conversationFilePaths(messages)])] };
}
