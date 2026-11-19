import { Button } from '@mastra/playground-ui/components/Button';
import { ChatFilePathsContext } from '@mastra/playground-ui/domains/chat/context/chat-context';
import { useIsMobile } from '@mastra/playground-ui/hooks/use-is-mobile';
import { IconSidebarSimpleRightWide } from '@mastra/playground-ui/icons/central/IconSidebarSimpleRightWide';
import { t, useLocale } from '@mastra/playground-ui/lib/i18n';
import type { MouseEvent, ReactNode } from 'react';
import { useState } from 'react';
import { z } from 'zod';
import { ConversationTree } from '../subagents/conversation-tree';
import { ConversationFilesPanel } from './conversation-files-panel';
import { useConversationFilePaths } from './use-conversation-file-paths';
import { storageUrl } from '@/domains/account/storage-api';
import { AgentLayout } from '@/domains/agents/components/agent-layout';
import { useStudioConfig } from '@/domains/configuration/context/studio-config-state';

const viewSchema = z.object({
  open: z.boolean(),
  path: z.string().optional(),
  version: z.literal(2).optional(),
  seenPaths: z.array(z.string()).default([]),
});

/** The parent keys this component by server, user, agent and conversation. */
export function ConversationWorkspace({
  agentId,
  threadId,
  requestContext,
  scope,
  children,
}: {
  agentId: string;
  scope: string;
  threadId?: string;
  requestContext?: Record<string, unknown>;
  children: ReactNode;
}) {
  useLocale();
  const target = useStudioConfig();
  const { paths } = useConversationFilePaths({ agentId, threadId, requestContext });
  const isMobile = useIsMobile();
  const storageKey = `altflow:conversation-files:${scope}`;
  const [view, setView] = useState(() => {
    try {
      const saved = viewSchema.safeParse(JSON.parse(localStorage.getItem(storageKey) ?? 'null'));
      if (saved.success) return { ...saved.data, open: saved.data.version === 2 && saved.data.open };
    } catch {
      /* Storage can be disabled in private browsing. */
    }
    return { open: false, path: undefined, seenPaths: [] as string[] };
  });
  const hasFiles = paths.length > 0;
  const open = hasFiles && (view.open || paths.some(path => !view.seenPaths.includes(path)));
  const update = (change: { open: boolean; path?: string }) => {
    const next = { ...change, version: 2 as const, seenPaths: [...new Set([...view.seenPaths, ...paths])] };
    setView(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* In-memory state still works. */
    }
  };
  const openFileLink = (event: MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !target.baseUrl)
      return;
    if (!(event.target instanceof Element)) return;
    const link = event.target.closest('a[href]');
    if (!(link instanceof HTMLAnchorElement) || link.hasAttribute('download')) return;
    const url = new URL(link.href, window.location.href);
    const endpoint = new URL(storageUrl(target, '/download'));
    // Accept both absolute runtime links and same-origin relative storage links.
    const storageOrigin = url.origin === endpoint.origin || url.origin === window.location.origin;
    if (!storageOrigin || url.pathname !== endpoint.pathname) return;
    const path = url.searchParams.get('path');
    if (!path) return;
    event.preventDefault();
    event.stopPropagation();
    update({ open: true, path });
  };
  return (
    <AgentLayout
      agentId={agentId}
      rightDrawerLabel={t('Files and artifacts')}
      rightSlot={
        hasFiles && (isMobile || open) ? (
          <ConversationFilesPanel
            agentId={agentId}
            threadId={threadId}
            requestContext={requestContext}
            selectedPath={view.path}
            onSelect={path => update({ open: true, path })}
          />
        ) : undefined
      }
    >
      <div className="flex h-full min-h-0 flex-col" onClickCapture={openFileLink}>
        <ChatFilePathsContext.Provider value={paths}>
          <ConversationTree
            root={threadId}
            isNew={!threadId}
            actions={
              !isMobile &&
              hasFiles && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('Files and artifacts')}
                  aria-expanded={open}
                  onClick={() => update({ ...view, open: !open })}
                >
                  <IconSidebarSimpleRightWide />
                </Button>
              )
            }
          >
            {children}
          </ConversationTree>
        </ChatFilePathsContext.Provider>
      </div>
    </AgentLayout>
  );
}
