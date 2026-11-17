import type { ReasoningPart } from '@mastra/react/ui';

import { ProcessRow } from '../../preferences/process-row';
import { useWorkDetails } from '../../preferences/work-details-state';
import { getReasoningContent } from '../reasoning-content';
import { ReasoningActivity } from '@/ds/components/ai/activity';
import { ReasoningText } from '@/ds/components/ai/activity/presets/reasoning-text';
import { DshThink } from '@/ds/icons/dsh/DshThink';
import { t } from '@/lib/i18n';

export interface ReasoningPartRendererProps {
  part: ReasoningPart;
  /** Whether the passage starts expanded. Defaults to `true`. */
  defaultOpen?: boolean;
  showPreview?: boolean;
}

export const ReasoningPartRenderer = ({ part, defaultOpen, showPreview }: ReasoningPartRendererProps) => {
  const process = useWorkDetails();
  const content = getReasoningContent(part);
  if (content && process) {
    const paragraphs = content.text.trim().split(/\n\s*\n/);
    const preview = content.streaming && paragraphs.length > 1 ? paragraphs.at(-2) : content.text;
    return (
      <ProcessRow
        icon={<DshThink />}
        label={t('Reasoning')}
        defaultOpen={defaultOpen}
        status={content.streaming ? 'running' : 'idle'}
        detail={showPreview && !content.redacted ? preview?.trim().split('\n')[0]?.replace(/\*\*/g, '') : undefined}
      >
        {(content.text.trim() || content.redacted) && (
          <ReasoningText content={content} className="text-caption text-muted-foreground [&_p]:my-0.5" />
        )}
      </ProcessRow>
    );
  }
  return content ? <ReasoningActivity {...content} defaultOpen={defaultOpen} showPreview={showPreview} /> : null;
};
