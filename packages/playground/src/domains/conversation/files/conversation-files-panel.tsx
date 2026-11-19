import { Button } from '@mastra/playground-ui/components/Button';
import { Txt } from '@mastra/playground-ui/components/Txt';
import { useChatMessages } from '@mastra/playground-ui/domains/chat/context/chat-context';
import { IconArrowLeft } from '@mastra/playground-ui/icons/central/IconArrowLeft';
import { IconArrowRotateClockwise } from '@mastra/playground-ui/icons/central/IconArrowRotateClockwise';
import { t, useLocale } from '@mastra/playground-ui/lib/i18n';
import { useMastraClient } from '@mastra/react';
import { useQuery } from '@tanstack/react-query';
import { conversationFilePaths, loadConversationFilePaths } from './conversation-file-paths';
import { ConversationFilePreview } from './conversation-file-preview';
import { ConversationFileTree } from './conversation-file-tree';
import { useAccount } from '@/domains/account/account-context';
import { getStorage } from '@/domains/account/storage-api';
import { useStudioConfig } from '@/domains/configuration/context/studio-config-state';

export function ConversationFilesPanel({
  selectedPath,
  onSelect,
  agentId,
  threadId,
  requestContext,
}: {
  selectedPath?: string;
  onSelect: (path: string | undefined) => void;
  agentId?: string;
  threadId?: string;
  requestContext?: Record<string, unknown>;
}) {
  useLocale();
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
  const storage = useQuery({
    queryKey: ['account-storage', target.baseUrl, account?.user.id, target.headers],
    queryFn: () => getStorage(target),
    enabled: Boolean(target.baseUrl),
    refetchInterval: 10_000,
  });
  const paths = new Set([...(history.data ?? []), ...conversationFilePaths(messages)]);
  const files = (storage.data?.files ?? []).filter(file => paths.has(file.path));
  const selected = files.find(file => file.path === selectedPath);
  return (
    <aside aria-label={t('Files and artifacts')} className="bg-surface1 flex h-full min-h-0 flex-col">
      <div className="flex justify-end px-3 pt-2">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t('Refresh files')}
          disabled={storage.isFetching}
          onClick={() => {
            void storage.refetch();
            if (threadId) void history.refetch();
          }}
        >
          <IconArrowRotateClockwise />
        </Button>
      </div>
      {storage.isError || history.isError ? (
        <div className="space-y-3 p-4">
          <Txt role="alert">{storage.error?.message ?? history.error?.message}</Txt>
          <Button
            size="sm"
            onClick={() => {
              void storage.refetch();
              if (threadId) void history.refetch();
            }}
          >
            {t('Retry')}
          </Button>
        </div>
      ) : (storage.isPending && target.baseUrl) || (history.isFetching && !history.data) ? (
        <Txt tone="muted" className="p-4">
          {t('Loading...')}
        </Txt>
      ) : selected ? (
        <ConversationFilePreview key={selected.path} file={selected} onBack={() => onSelect(undefined)} />
      ) : selectedPath ? (
        <div className="space-y-3 p-4">
          <Txt tone="muted">{t('This file is no longer available.')}</Txt>
          <Button size="sm" icon={<IconArrowLeft />} onClick={() => onSelect(undefined)}>
            {t('Back to files')}
          </Button>
        </div>
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-auto px-3 pb-4">
            {files.length ? (
              <ConversationFileTree files={files} onSelect={onSelect} />
            ) : (
              <Txt tone="muted" className="p-2">
                {t('No files found.')}
              </Txt>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
