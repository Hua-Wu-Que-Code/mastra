import { ActivityItem } from '../activity';
import { ReasoningText } from './reasoning-text';
import { hasReasoningText, hasVisibleReasoning } from './reasoning-visibility';
import type { ReasoningContent } from './reasoning-visibility';
import { agentGlyph } from '@/ds/components/AgentIndicator';
import { t as studioT, useLocale } from '@/lib/i18n';

const ThinkingGlyph = agentGlyph('thinking');

export interface ReasoningActivityProps extends ReasoningContent {
  defaultOpen?: boolean;
  showPreview?: boolean;
}

export function ReasoningActivity({ defaultOpen = true, showPreview = false, ...content }: ReasoningActivityProps) {
  useLocale();
  if (!hasVisibleReasoning(content)) return null;

  return (
    <ActivityItem
      icon={<ThinkingGlyph aria-hidden />}
      label={studioT('Reasoning')}
      detail={showPreview && !content.streaming ? content.text?.trim().split('\n')[0] : undefined}
      status={content.streaming ? 'running' : 'idle'}
      defaultOpen={defaultOpen}
      aria-label={studioT('Reasoning')}
    >
      {hasReasoningText(content) && (
        <ReasoningText content={content} className="text-caption text-muted-foreground [&_p]:my-0.5" />
      )}
    </ActivityItem>
  );
}
