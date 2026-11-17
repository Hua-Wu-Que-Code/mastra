import type { MastraDBMessage } from '@mastra/core/agent/message-list';
import { useMcpAppTools } from '@mastra/react/hooks/mcps';
import { useContext, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useChatPreferences } from './chat-preferences-context';
import { canFoldWork, finalReply, isWorkPart } from './work-details';
import type { WorkDetailsPresentation } from './work-details';
import { WorkDetailsContext, WorkDetailsControlContext } from './work-details-state';
import { Button } from '@/ds/components/Button';
import { DisclosureChevron } from '@/ds/components/DisclosureChevron';
import { Txt } from '@/ds/components/Txt';
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

  const control = foldable && (
    <Button
      ref={trigger}
      variant="ghost"
      size="sm"
      className="w-fit text-muted-foreground"
      aria-label={expanded ? t('Hide work details') : t('Show work details')}
      aria-expanded={expanded}
      onClick={() => {
        trigger.current?.focus();
        setManual({ mode: preferences.workDetails, expanded: !expanded });
      }}
    >
      <DisclosureChevron direction={expanded ? 'down' : 'right'} />
      <Txt as="span" variant="caption">
        {t('Work details: {count} steps', { count })}
      </Txt>
    </Button>
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
