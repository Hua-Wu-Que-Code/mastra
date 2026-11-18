import { Button } from '@mastra/playground-ui/components/Button';
import { MarkdownRenderer } from '@mastra/playground-ui/components/MarkdownRenderer';
import { Textarea } from '@mastra/playground-ui/components/Textarea';
import { Txt } from '@mastra/playground-ui/components/Txt';
import { IconArrowUp } from '@mastra/playground-ui/icons/central/IconArrowUp';
import { IconStop } from '@mastra/playground-ui/icons/central/IconStop';
import { t } from '@mastra/playground-ui/lib/i18n';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { childDuration, childUsage } from './child-metrics';
import { subagentRequest } from './subagent-api';
import type { ChildAgent } from './subagent-api';
import { useAccount } from '@/domains/account/account-context';
import { useStudioConfig } from '@/domains/configuration/context/studio-config-state';

export function ChildConversation({ root, id, child }: { root: string; id: string; child?: ChildAgent }) {
  const target = useStudioConfig();
  const account = useAccount();
  const client = useQueryClient();
  const [page, setPage] = useState(0);
  const [prompt, setPrompt] = useState('');
  const history = useQuery({
    queryKey: ['child-conversation', target.baseUrl, target.headers, account?.user.id, root, id, page],
    queryFn: ({ signal }) => subagentRequest(target, root, id, undefined, page, signal),
    refetchInterval: page === 0 ? 1000 : false,
    retry: false,
  });
  const mutation = useMutation({
    mutationFn: (action: { action: 'prompt'; prompt: string } | { action: 'interrupt' }) =>
      subagentRequest(target, root, id, action),
    onSuccess: (_, action) => {
      if (action.action === 'prompt') {
        setPrompt('');
        setPage(0);
      }
      void client.invalidateQueries({ queryKey: ['child-conversation'] });
      void client.invalidateQueries({ queryKey: ['conversation-tree'] });
    },
  });
  const active = child && ['preparing', 'queued', 'running'].includes(child.state);
  const send = () => {
    if (prompt.trim() && !mutation.isPending) mutation.mutate({ action: 'prompt', prompt: prompt.trim() });
  };
  return (
    <section className="flex h-full min-h-0 flex-col" aria-label={t('Sub-agent conversation')}>
      <div className="min-h-0 flex-1 overflow-auto px-6 py-4">
        <div className="mx-auto max-w-3xl space-y-6">
          {history.isPending && <Txt tone="muted">{t('Loading...')}</Txt>}
          {history.isError ? (
            <div className="flex gap-2">
              <Txt role="alert">{history.error.message}</Txt>
              <Button size="sm" onClick={() => void history.refetch()}>
                {t('Retry')}
              </Button>
            </div>
          ) : (
            <>
              <div className="flex justify-center gap-2">
                {history.data?.hasMore && (
                  <Button variant="ghost" size="sm" onClick={() => setPage(page + 1)}>
                    {t('Older messages')}
                  </Button>
                )}
                {page > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setPage(page - 1)}>
                    {t('Newer messages')}
                  </Button>
                )}
              </div>
              {history.data?.messages.map(message => (
                <div
                  key={message.id}
                  className={
                    message.role === 'user' ? 'ml-auto w-fit max-w-full rounded-2xl bg-surface3 px-4 py-3' : ''
                  }
                >
                  {message.tools.map((tool, index) => (
                    <Txt
                      key={`${tool.name}:${index}`}
                      tone="muted"
                      variant="caption"
                      className="flex items-center gap-3 py-1"
                    >
                      <span>{tool.name}</span>
                      <span>{tool.state}</span>
                    </Txt>
                  ))}
                  {message.text && <MarkdownRenderer>{message.text}</MarkdownRenderer>}
                </div>
              ))}
              {active && (
                <Txt role="status" tone="muted">
                  {t('Working…')}
                </Txt>
              )}
              {child?.error && <Txt role="alert">{child.error}</Txt>}
            </>
          )}
        </div>
      </div>
      <div className="mx-auto w-full max-w-3xl shrink-0 space-y-2 px-4 pb-4">
        {child && (
          <div className="flex items-center gap-3">
            <Txt tone="muted" variant="caption">
              {child.name}
            </Txt>
            <Txt tone="muted" variant="caption">
              {t(child.state)}
            </Txt>
            <Txt tone="muted" variant="caption">
              {childUsage(child)}
            </Txt>
            <Txt tone="muted" variant="caption">
              {childDuration(child)}
            </Txt>
          </div>
        )}
        {mutation.isError && <Txt role="alert">{mutation.error.message}</Txt>}
        <form
          onSubmit={event => {
            event.preventDefault();
            send();
          }}
          className="rounded-2xl border border-border bg-surface1 p-3"
        >
          <Textarea
            aria-label={t('Message sub-agent')}
            placeholder={t('Message sub-agent')}
            maxLength={32000}
            value={prompt}
            onChange={event => setPrompt(event.target.value)}
            disabled={!history.data || mutation.isPending}
            onKeyDown={event => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                send();
              }
            }}
          />
          <div className="mt-2 flex justify-end gap-2">
            {active && (
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={t('Stop sub-agent')}
                disabled={mutation.isPending}
                onClick={() => mutation.mutate({ action: 'interrupt' })}
              >
                <IconStop />
              </Button>
            )}
            <Button
              type="submit"
              size="icon-sm"
              aria-label={t('Send message')}
              disabled={!history.data || !prompt.trim() || mutation.isPending}
            >
              <IconArrowUp />
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
