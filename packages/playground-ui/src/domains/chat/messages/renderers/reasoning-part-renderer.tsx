import type { ReasoningPart } from '@mastra/react/ui';

import { getReasoningContent } from '../reasoning-content';
import { ReasoningActivity } from '@/ds/components/ai/activity';

export interface ReasoningPartRendererProps {
  part: ReasoningPart;
  /** Whether the passage starts expanded. Defaults to `true`. */
  defaultOpen?: boolean;
  showPreview?: boolean;
}

export const ReasoningPartRenderer = ({ part, defaultOpen, showPreview }: ReasoningPartRendererProps) => {
  const content = getReasoningContent(part);
  return content ? <ReasoningActivity {...content} defaultOpen={defaultOpen} showPreview={showPreview} /> : null;
};
