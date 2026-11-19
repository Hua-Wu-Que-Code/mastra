import type { MastraDBMessage } from '@mastra/core/agent/message-list';
import { useMcpAppTools } from '@mastra/react/hooks/mcps';
import { useContext, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { isToolPart, readToolPart } from '../messages/renderers/tool-part';
import { useTurnMetrics } from '../metrics/chat-metrics-context';
import { runDurationLabel } from '../metrics/run-duration';
import { isSettledState } from '../tools/tool-card-kind';
import { chatContentStyle } from './chat-content-style';
import { useChatPreferences } from './chat-preferences-context';
import { canFoldWork, finalReply, isWorkPart } from './work-details';
import type { WorkDetailsPresentation } from './work-details';
import { WorkDetailsContext, WorkDetailsControlContext } from './work-details-state';
import { DshChevronDown } from '@/ds/icons/dsh/DshChevronDown';
import { t, useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/** Place after the user's message, before the assistant's work. */
export function WorkDetailsToggle() {
  return useContext(WorkDetailsControlContext);
}

/** One user turn owns the fold; changing preferences never changes the recorded messages. */
export function WorkDetails({
  messages,
  running,
  latest,
  children,
}: {
  messages: MastraDBMessage[];
  running: boolean;
  latest: boolean;
  children: ReactNode;
}) {
  useLocale();
  const { preferences } = useChatPreferences();
  const metrics = useTurnMetrics(messages);
  const { data: mcpAppTools } = useMcpAppTools();
  const [manual, setManual] = useState<{ mode: string; expanded: boolean }>();
  const [focusWithinWork, setFocusWithinWork] = useState(false);
  const [keepActiveLayout, setKeepActiveLayout] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const count = messages.reduce(
    (total, message) =>
      total +
      message.content.parts.filter(
        part => message.role === 'assistant' && isWorkPart(part, { metadata: message.content.metadata, mcpAppTools }),
      ).length,
    0,
  );
  const deferred = latest && preferences.collapseTiming === 'next-input';
  const safeToFold = canFoldWork(messages, { mcpAppTools });
  const answer = finalReply(messages);
  const foldable = preferences.workDetails !== 'verbose' && count > 0 && safeToFold && (running || Boolean(answer));
  const automaticallyExpanded = running || deferred || focusWithinWork;
  const expanded = !foldable || (manual?.mode === preferences.workDetails ? manual.expanded : automaticallyExpanded);
  const historical = !running && !deferred && !keepActiveLayout;
  const presentation: WorkDetailsPresentation = {
    collapsed: !expanded,
    metrics,
    lastAssistantId: messages.findLast(message => message.role === 'assistant')?.id,
    groupTools:
      (running || safeToFold) &&
      (preferences.workDetails === 'compact' ||
        preferences.workDetails === 'standard' ||
        (preferences.workDetails === 'detailed' && historical)),
    showReasoningPreview: preferences.workDetails !== 'compact',
    showLiveDetail: preferences.workDetails !== 'compact',
    hideIntermediateReplies: preferences.foldedReplies === 'final',
    finalReply: answer,
  };

  const hasAssistant = messages.some(message => message.role === 'assistant');
  const lastRun = metrics.at(-1);
  const firstRun = metrics.at(0);
  const elapsed =
    firstRun?.startedAt !== undefined && lastRun?.endedAt !== undefined
      ? lastRun.endedAt - firstRun.startedAt
      : undefined;
  const tools = messages.flatMap(message =>
    message.content.parts.flatMap(part => (isToolPart(part) ? [readToolPart(part)] : [])),
  );
  const unfinished = tools.some(tool => !isSettledState(tool.state) || tool.backgroundTaskStatus === 'running');
  const failed =
    tools.some(tool => tool.state === 'output-error' || tool.backgroundTaskStatus === 'failed') ||
    messages.some(message => message.content.metadata?.status === 'error') ||
    ['error', 'failed'].includes(lastRun?.outcome ?? '');
  const stopped =
    messages.some(message => message.content.metadata?.status === 'aborted') ||
    lastRun?.outcome === 'aborted' ||
    lastRun?.outcome === 'interrupted';
  const status = failed ? t('Failed') : stopped ? t('Stopped') : unfinished ? t('Incomplete') : t('Completed');
  const label = running
    ? t('Working…')
    : elapsed !== undefined && !failed && !stopped && !unfinished
      ? t('Completed, took {duration}', { duration: runDurationLabel(elapsed) })
      : status;
  const control = hasAssistant && (
    <button
      ref={trigger}
      type="button"
      style={chatContentStyle(preferences.fontSize)}
      className="box-border flex h-[calc(33px+var(--dsh-content-font-delta,0px))] w-full items-center border-b-[0.5px] border-border pb-2 text-left text-body text-muted-foreground transition-colors duration-100 focus-visible:outline-border-focus enabled:cursor-pointer enabled:hover:text-foreground motion-reduce:transition-none"
      disabled={!foldable}
      aria-label={foldable ? (expanded ? t('Hide work details') : t('Show work details')) : label}
      aria-expanded={foldable ? expanded : undefined}
      onClick={() => {
        trigger.current?.focus();
        setManual({ mode: preferences.workDetails, expanded: !expanded });
      }}
    >
      <span aria-live="polite" className="min-w-0 truncate tabular-nums">
        {label}
      </span>
      {foldable && (
        <span
          data-process-turn-chevron=""
          className={cn(
            'ml-1 flex shrink-0 transition-transform duration-100 motion-reduce:transition-none [&_svg]:size-3.5',
            expanded && 'rotate-180',
          )}
        >
          <DshChevronDown />
        </span>
      )}
    </button>
  );
  return (
    <WorkDetailsContext.Provider value={presentation}>
      <WorkDetailsControlContext.Provider value={control}>
        <div
          className="contents"
          onFocusCapture={event => {
            if (event.target instanceof Element && event.target.closest('[data-work-details]')) {
              setFocusWithinWork(true);
              if (running || deferred) setKeepActiveLayout(true);
            }
          }}
          onBlurCapture={event => {
            const next = event.relatedTarget;
            if (!(next instanceof Element) || !next.closest('[data-work-details]')) {
              setFocusWithinWork(false);
              setKeepActiveLayout(false);
            }
          }}
        >
          {children}
        </div>
      </WorkDetailsControlContext.Provider>
    </WorkDetailsContext.Provider>
  );
}
