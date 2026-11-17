import { Button } from '@mastra/playground-ui/components/Button';
import { Txt } from '@mastra/playground-ui/components/Txt';
import { useChatQueue, useChatRunning } from '@mastra/playground-ui/domains/chat/context/chat-context';
import type { ChatQueueAction } from '@mastra/playground-ui/domains/chat/context/chat-context';
import { t, useLocale } from '@mastra/playground-ui/lib/i18n';
import { ArrowDownIcon, ArrowUpIcon, ChevronDownIcon, ChevronUpIcon, XIcon } from 'lucide-react';
import { useRef, useState } from 'react';

/** Admitted follow-ups stay by the composer until the thread consumes them. */
export function QueuedMessages() {
  useLocale();
  const { messages, update } = useChatQueue();
  const { isRunning } = useChatRunning();
  const [collapsed, setCollapsed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const updating = useRef(false);
  if (messages.length === 0) return null;

  const perform = async (id: string, action: ChatQueueAction) => {
    if (updating.current) return;
    updating.current = true;
    setPending(true);
    setError(false);
    try {
      await update(id, action);
    } catch {
      setError(true);
    } finally {
      updating.current = false;
      setPending(false);
    }
  };

  return (
    <section
      aria-label={t('Queued messages')}
      className="mx-3 overflow-hidden rounded-t-2xl border border-b-0 border-border bg-muted"
    >
      <div className="flex min-h-9 items-center justify-between gap-2 px-3">
        <div className="flex items-center gap-2">
          <Txt variant="caption" tone="muted">
            {t('Queued messages')}
          </Txt>
          <Txt variant="caption" tone="muted" className="tabular-nums">
            {messages.length}
          </Txt>
        </div>
        {messages.length > 1 && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t('Toggle queued messages')}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed(value => !value)}
          >
            {collapsed ? <ChevronDownIcon /> : <ChevronUpIcon />}
          </Button>
        )}
      </div>
      {(!collapsed || messages.length === 1) && (
        <ol className="max-h-44 overflow-y-auto px-2 pb-2">
          {messages.map((message, index) => {
            const awaitingAcceptance = message.id.startsWith('client-set-');
            const text = message.content.parts.flatMap(part => (part.type === 'text' ? [part.text] : [])).join(' ');
            const fileCount = message.content.parts.filter(part => part.type === 'file').length;
            return (
              <li key={message.id} className="flex min-h-9 items-center gap-2 rounded-xl px-2 hover:bg-fill-subtle">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Txt variant="caption" className="truncate">
                    {text || t('Attachment')}
                  </Txt>
                  {fileCount > 0 && (
                    <Txt variant="caption" tone="muted" className="shrink-0">
                      {fileCount} {t('Attachment')}
                    </Txt>
                  )}
                </div>
                {awaitingAcceptance ? (
                  <Txt variant="caption" tone="muted">
                    {t('Sending…')}
                  </Txt>
                ) : (
                  <div className="flex shrink-0 items-center gap-0.5">
                    {messages.length > 1 && (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t('Move queued message up')}
                          disabled={pending || index === 0}
                          onClick={() => void perform(message.id, 'move-up')}
                        >
                          <ArrowUpIcon />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t('Move queued message down')}
                          disabled={pending || index === messages.length - 1}
                          onClick={() => void perform(message.id, 'move-down')}
                        >
                          <ArrowDownIcon />
                        </Button>
                      </>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={t('Steer agent')}
                      disabled={pending || !isRunning}
                      onClick={() => void perform(message.id, 'steer')}
                    >
                      {t('Steer')}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t('Remove queued message')}
                      disabled={pending}
                      onClick={() => void perform(message.id, 'remove')}
                    >
                      <XIcon />
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
      {error && (
        <Txt variant="caption" role="alert" className="px-4 pb-2">
          {t('Could not update the queue. Try again.')}
        </Txt>
      )}
    </section>
  );
}
