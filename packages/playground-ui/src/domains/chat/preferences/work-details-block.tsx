import type { MessageFactoryPart } from '@mastra/react/ui';
import type { ReactNode } from 'react';
import { getReasoningContent } from '../messages/reasoning-content';
import { isToolPart, readToolPart } from '../messages/renderers/tool-part';
import { isSettledState } from '../tools/tool-card-kind';
import { useWorkDetails } from './work-details-state';
import { ActivityItem } from '@/ds/components/ai/activity';
import { presentTool } from '@/ds/components/ai/tool-call';
import { IconArrowsHide } from '@/ds/icons/central/IconArrowsHide';
import { t, useLocale } from '@/lib/i18n';

export function WorkDetailsBlock({ parts, children }: { parts: MessageFactoryPart[]; children: ReactNode }) {
  useLocale();
  const presentation = useWorkDetails();
  if (!presentation?.groupTools) return children;
  const tools = parts.filter(isToolPart).map(readToolPart);
  const activeTool = tools.find(tool => !isSettledState(tool.state) || tool.backgroundTaskStatus === 'running');
  const fields = activeTool ?? tools.at(-1);
  const running =
    Boolean(activeTool) || parts.some(part => part.type === 'reasoning' && getReasoningContent(part)?.streaming);
  const live = fields && presentTool(fields.toolName, fields.input);
  const detail = presentation.showLiveDetail && live ? live.description || live.detail : undefined;
  const label =
    tools.length === 0
      ? running
        ? t('Analyzing…')
        : t('Analysis completed')
      : running
        ? t('Executing tools…')
        : t('Tools completed: {count}', { count: tools.length });
  return (
    <ActivityItem
      icon={<IconArrowsHide aria-hidden />}
      label={label}
      detail={detail}
      status={running ? 'running' : 'idle'}
      aria-label={t('Work details: {count} steps', { count: parts.length })}
    >
      {children}
    </ActivityItem>
  );
}
