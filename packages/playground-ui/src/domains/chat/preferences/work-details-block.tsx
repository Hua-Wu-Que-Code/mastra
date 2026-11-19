import type { MessageFactoryPart } from '@mastra/react/ui';
import type { ReactNode } from 'react';
import { getReasoningContent } from '../messages/reasoning-content';
import { isToolPart, readToolPart } from '../messages/renderers/tool-part';
import { isSettledState } from '../tools/tool-card-kind';
import { presentProcessTool } from './process-presentation';
import { ProcessRow } from './process-row';
import { useWorkDetails } from './work-details-state';
import { DshThink } from '@/ds/icons/dsh/DshThink';
import { t, useLocale } from '@/lib/i18n';

export function WorkDetailsBlock({ parts, children }: { parts: MessageFactoryPart[]; children: ReactNode }) {
  useLocale();
  const presentation = useWorkDetails();
  if (!presentation?.groupTools) return children;
  const tools = parts.filter(isToolPart).map(readToolPart);
  const active = parts.findLast(part => {
    if (part.type === 'reasoning') return getReasoningContent(part)?.streaming;
    if (!isToolPart(part)) return false;
    const tool = readToolPart(part);
    return !isSettledState(tool.state) || tool.backgroundTaskStatus === 'running';
  });
  const fields = active ? (isToolPart(active) ? readToolPart(active) : undefined) : tools.at(-1);
  const running = Boolean(active);
  const live = fields && presentProcessTool(fields.toolName, fields.input);
  const categories = new Map<string, { count: number; done: string }>();
  const seen = new Set<string>();
  for (const tool of tools) {
    if (tool.toolCallId && seen.has(tool.toolCallId)) continue;
    if (tool.toolCallId) seen.add(tool.toolCallId);
    const item = presentProcessTool(tool.toolName, tool.input);
    categories.set(item.kind, { count: (categories.get(item.kind)?.count ?? 0) + 1, done: item.done });
  }
  const ranked = [...categories.values()].sort((a, b) => b.count - a.count);
  const completed = ranked.slice(0, 3).map(item => item.done);
  const separator = t('Process category separator');
  const summary = completed
    .map((text, i) => (i === 0 ? text : text.charAt(0).toLowerCase() + text.slice(1)))
    .join(separator);
  const label = running
    ? (live?.label ?? t('Analyzing…'))
    : summary
      ? summary + (ranked.length > 3 ? '…' : '')
      : t('Analysis completed');
  const Glyph = live?.icon ?? DshThink;
  return (
    <ProcessRow
      icon={<Glyph />}
      label={label}
      detail={running && presentation.showLiveDetail ? live?.detail : undefined}
      status={running ? 'running' : 'idle'}
      defaultOpen={false}
      ariaLabel={t('Work details: {count} steps', { count: parts.length })}
      group
    >
      {children}
    </ProcessRow>
  );
}
