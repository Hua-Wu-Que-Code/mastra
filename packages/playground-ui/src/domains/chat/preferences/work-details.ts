import type { MastraDBMessage } from '@mastra/core/agent/message-list';
import type { MessageFactoryPart } from '@mastra/react/ui';
import { messageTextKind } from '../messages/renderers/message-text-kind';
import { isToolPart, readToolPart } from '../messages/renderers/tool-part';
import type { RunMetrics } from '../metrics/chat-metrics';
import { isHiddenTool, isSettledState } from '../tools/tool-card-kind';
import type { ToolCardContext } from '../tools/tool-card-kind';
import { foldsIntoGroup } from '../tools/tool-groups';

export function isWorkPart(part: MessageFactoryPart, context: ToolCardContext): boolean {
  if (part.type === 'reasoning') return true;
  if (!isToolPart(part)) return false;
  const fields = readToolPart(part);
  if (fields.state === 'output-error' || fields.backgroundTaskStatus === 'failed') return false;
  return foldsIntoGroup(part, context);
}

/** Keep errors, approval cards, unanswered questions and unfinished calls outside automatic folding. */
export function canFoldWork(messages: MastraDBMessage[], context: ToolCardContext): boolean {
  return messages.every(message => {
    if (message.content.metadata?.status === 'error' || message.content.metadata?.status === 'aborted') return false;
    return message.content.parts.every(part => {
      if (part.type === 'error') return false;
      if (!isToolPart(part)) return true;
      const fields = readToolPart(part);
      if (fields.backgroundTaskStatus === 'running' || fields.backgroundTaskStatus === 'failed') return false;
      // Successful bookkeeping has no transcript card to fold. Do not let it
      // disable the disclosure for the visible reasoning and tools in this turn.
      return (
        isSettledState(fields.state) &&
        (isHiddenTool(fields.toolName) || foldsIntoGroup(part, { ...context, metadata: message.content.metadata }))
      );
    });
  });
}

export function finalReply(messages: MastraDBMessage[]) {
  for (const message of messages.toReversed()) {
    if (message.role !== 'assistant') continue;
    // Mastra can store several steps in one assistant message. Everything after
    // the final tool/reasoning boundary belongs to the answer, including split text parts.
    const boundary = message.content.parts.findLastIndex(
      part => part.type === 'reasoning' || (isToolPart(part) && !isHiddenTool(readToolPart(part).toolName)),
    );
    const start = message.content.parts.findIndex(
      (part, index) =>
        index > boundary &&
        part.type === 'text' &&
        part.text.trim() &&
        messageTextKind(part.text, message.content.metadata) === 'prose',
    );
    if (start >= 0) return { messageId: message.id, start };
    // A trailing tool step has no final answer yet. Never use an earlier progress update as the answer.
    if (boundary >= 0) return undefined;
  }
  return undefined;
}

export interface WorkDetailsPresentation {
  collapsed: boolean;
  metrics?: RunMetrics[];
  lastAssistantId?: string;
  groupTools: boolean;
  showReasoningPreview: boolean;
  showLiveDetail: boolean;
  hideIntermediateReplies: boolean;
  finalReply?: ReturnType<typeof finalReply>;
}

export function presentedParts(
  message: MastraDBMessage,
  presentation: WorkDetailsPresentation | undefined,
  context: ToolCardContext,
) {
  if (!presentation?.collapsed || message.role !== 'assistant') return message.content.parts;
  return message.content.parts.filter((part, index) => {
    if (isWorkPart(part, context)) return false;
    if (part.type !== 'text' || !presentation.hideIntermediateReplies || !presentation.finalReply) return true;
    if (messageTextKind(part.text, message.content.metadata) !== 'prose') return true;
    return message.id === presentation.finalReply.messageId && index >= presentation.finalReply.start;
  });
}

/** Text and interactive cards break a process group, preserving transcript order. */
export function workBlocks(parts: MastraDBMessage['content']['parts'], context: ToolCardContext) {
  const blocks: { key: number; work: boolean; parts: MastraDBMessage['content']['parts'] }[] = [];
  for (const [index, part] of parts.entries()) {
    const work = isWorkPart(part, context);
    const previous = blocks.at(-1);
    if (previous && previous.work === work) previous.parts.push(part);
    else blocks.push({ key: index, work, parts: [part] });
  }
  return blocks;
}
