import { Button } from '@mastra/playground-ui/components/Button';
import { Popover, PopoverContent, PopoverTrigger } from '@mastra/playground-ui/components/Popover';
import { Txt } from '@mastra/playground-ui/components/Txt';
import { IconAgents } from '@mastra/playground-ui/icons/central/IconAgents';
import { t, useLocale } from '@mastra/playground-ui/lib/i18n';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { ChildConversation } from './child-conversation';
import { childUsage, childDuration } from './child-metrics';
import { subagentRequest } from './subagent-api';
import type { ChildAgent } from './subagent-api';
import { useAccount } from '@/domains/account/account-context';
import { useStudioConfig } from '@/domains/configuration/context/studio-config-state';

export function ChildStatus({ child }: { child: ChildAgent }) {
  const active = ['preparing', 'queued', 'running'].includes(child.state);
  return (
    <span
      title={t(child.state)}
      aria-label={t(child.state)}
      className={`mt-1.5 size-1.5 shrink-0 rounded-full ${active ? 'animate-pulse bg-accent1' : child.state === 'completed' ? 'bg-green-500' : child.state === 'failed' ? 'bg-red-500' : 'bg-neutral3'}`}
    />
  );
}
export function ConversationTree({
  root,
  isNew,
  actions,
  children,
}: {
  root?: string;
  isNew?: boolean;
  actions?: ReactNode;
  children: ReactNode;
}) {
  useLocale();
  const target = useStudioConfig();
  const account = useAccount();
  const [search, setSearch] = useSearchParams();
  const childId = search.get('child') ?? undefined;
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: ['conversation-tree', target.baseUrl, target.headers, account?.user.id, root],
    queryFn: ({ signal }) => subagentRequest(target, root!, undefined, undefined, 0, signal),
    enabled: Boolean(root && !isNew && target.baseUrl),
    retry: false,
    refetchInterval: 2000,
  });
  const selected = query.data?.children.find(child => child.id === childId);
  const select = (id?: string) => {
    const next = new URLSearchParams(search);
    if (id) next.set('child', id);
    else next.delete('child');
    setSearch(next);
    setOpen(false);
  };
  const title = query.data?.title || t('New chat');
  const agents = query.data?.children ?? [];
  const activeCount = agents.filter(child => ['preparing', 'queued', 'running'].includes(child.state)).length;
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 px-3 py-2">
        {childId ? (
          <Button variant="ghost" size="sm" className="min-w-0 max-w-52 truncate" onClick={() => select()}>
            {title}
          </Button>
        ) : (
          <Txt variant="body" className="min-w-0 truncate">
            {title}
          </Txt>
        )}
        {childId && (
          <>
            <Txt tone="muted">/</Txt>
            <Txt className="min-w-0 max-w-64 truncate">{selected?.description ?? t('Sub-agent')}</Txt>
          </>
        )}
        {agents.length > 0 && (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                icon={<IconAgents />}
                aria-label={t('{count} sub-agents', { count: agents.length })}
                aria-description={t('{count} running', { count: activeCount })}
              >
                {t('{count} sub-agents', { count: agents.length })}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="max-h-[70vh] w-90 max-w-[calc(100vw-2rem)] overflow-auto p-1.5">
              {agents.map(child => (
                <button
                  key={child.id}
                  type="button"
                  aria-current={child.id === childId ? 'page' : undefined}
                  onClick={() => select(child.id)}
                  className="flex w-full items-start gap-3 rounded-md px-3 py-2 text-left hover:bg-surface3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent1"
                >
                  <ChildStatus child={child} />
                  <span className="min-w-0 flex-1">
                    <Txt className="block break-words">{child.description}</Txt>
                    <Txt tone="muted" variant="caption">
                      {child.name}
                    </Txt>
                  </span>
                  <span className="shrink-0 text-right">
                    <Txt variant="caption" className="block">
                      {childUsage(child)}
                    </Txt>
                    <Txt variant="caption" tone="muted">
                      {childDuration(child)}
                    </Txt>
                  </span>
                </button>
              ))}
            </PopoverContent>
          </Popover>
        )}
        <div className="ml-auto flex items-center">{actions}</div>
      </div>
      {query.isError && (
        <div className="flex items-center gap-2 px-4">
          <Txt role="alert" tone="muted">
            {query.error.message}
          </Txt>
          <Button size="sm" variant="ghost" onClick={() => void query.refetch()}>
            {t('Retry')}
          </Button>
        </div>
      )}
      <div className="relative min-h-0 flex-1">
        {childId && root ? (
          <ChildConversation key={`${root}:${childId}`} root={root} id={childId} child={selected} />
        ) : (
          children
        )}
      </div>
      {query.data?.teamEnabled && query.data.tasks.length > 0 && (
        <details className="shrink-0 border-t border-border px-4 py-2">
          <summary className="cursor-pointer text-ui-sm">
            {t('Shared tasks')} ({query.data.tasks.length})
          </summary>
          <ul>
            {query.data.tasks.map(task => (
              <li key={task.id} className="flex items-center gap-3 py-1 text-ui-sm">
                <span>{task.subject}</span>
                <span>{t(task.status)}</span>
                {task.owner && <span>{task.owner}</span>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
