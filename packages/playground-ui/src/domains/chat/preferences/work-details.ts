import type { MastraDBMessage } from '@mastra/core/agent/message-list';
import type { MessageFactoryPart } from '@mastra/react/ui';
import { messageTextKind } from '../messages/renderers/message-text-kind';
import { isToolPart, readToolPart } from '../messages/renderers/tool-part';
import { isSettledState } from '../tools/tool-card-kind';
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
      return isSettledState(fields.state) && foldsIntoGroup(part, { ...context, metadata: message.content.metadata });
    });
  });
}

export function finalReply(messages: MastraDBMessage[]) {
  for (const message of messages.toReversed()) {
    if (message.role !== 'assistant') continue;
    for (const part of message.content.parts.toReversed()) {
      if (part.type === 'text' && part.text.trim() && messageTextKind(part.text, message.content.metadata) === 'prose')
        return { messageId: message.id, text: part.text };
    }
  }
  return undefined;
}

export interface WorkDetailsPresentation {
  collapsed: boolean;
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
  return message.content.parts.filter(part => {
    if (isWorkPart(part, context)) return false;
    if (part.type !== 'text' || !presentation.hideIntermediateReplies || !presentation.finalReply) return true;
    if (messageTextKind(part.text, message.content.metadata) !== 'prose') return true;
    return message.id === presentation.finalReply.messageId && part.text === presentation.finalReply.text;
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
