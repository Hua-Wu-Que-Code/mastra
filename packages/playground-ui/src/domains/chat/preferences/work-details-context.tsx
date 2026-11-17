import type { MastraDBMessage } from '@mastra/core/agent/message-list';
import { useMcpAppTools } from '@mastra/react/hooks/mcps';
import { useContext, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { isToolPart, readToolPart } from '../messages/renderers/tool-part';
import { useTurnMetrics } from '../metrics/chat-metrics-context';
import { runDurationLabel } from '../metrics/run-duration';
import { isSettledState } from '../tools/tool-card-kind';
import { useChatPreferences } from './chat-preferences-context';
import { canFoldWork, finalReply, isWorkPart } from './work-details';
import type { WorkDetailsPresentation } from './work-details';
import { WorkDetailsContext, WorkDetailsControlContext } from './work-details-state';
import { DshChevronDown } from '@/ds/icons/dsh/DshChevronDown';
import { DshChevronUp } from '@/ds/icons/dsh/DshChevronUp';
import { t, useLocale } from '@/lib/i18n';

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
  const foldable = preferences.workDetails !== 'verbose' && count > 0 && safeToFold;
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
    finalReply: finalReply(messages),
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
      className="flex w-full items-center gap-1.5 border-b border-border pb-3 text-left text-caption text-muted-foreground focus-visible:outline-border-focus enabled:cursor-pointer enabled:hover:text-foreground"
      disabled={!foldable}
      aria-label={foldable ? (expanded ? t('Hide work details') : t('Show work details')) : label}
      aria-expanded={foldable ? expanded : undefined}
      onClick={() => {
        trigger.current?.focus();
        setManual({ mode: preferences.workDetails, expanded: !expanded });
      }}
    >
      <span aria-live="polite">{label}</span>
      {foldable && <span className="[&_svg]:size-3.5">{expanded ? <DshChevronUp /> : <DshChevronDown />}</span>}
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
