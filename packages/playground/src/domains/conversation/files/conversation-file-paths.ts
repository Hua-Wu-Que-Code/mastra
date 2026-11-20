import type { MastraClient } from '@mastra/client-js';
import type { MastraDBMessage } from '@mastra/core/agent/message-list';

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const normalize = (value: unknown) => {
  if (typeof value !== 'string' || !value || value.includes('\\') || /[\x00-\x1f]/.test(value)) return;
  const parts = value
    .replace(/^\.\//, '')
    .split('/')
    .filter(part => part && part !== '.');
  if (parts.includes('..') || parts.length === 0) return;
  return '/' + parts.join('/');
};

/** File provenance comes from this thread, never from a workspace listing tool's output. */
export function conversationFilePaths(messages: readonly MastraDBMessage[]) {
  const paths = new Set<string>();
  const add = (path: unknown) => {
    const normalized = normalize(path);
    if (normalized) paths.add(normalized);
  };
  for (const message of messages) {
    if (message.role !== 'user' && message.role !== 'assistant') continue;
    for (const part of message.content.parts) {
      if (part.type === 'text') {
        for (const match of part.text.matchAll(/\/storage\/download\?[^\s<>"')]+/g)) {
          const path = new URL(match[0].replaceAll('&amp;', '&'), 'https://workspace.invalid').searchParams.get('path');
          if (path) add(path);
        }
        // Historical attachments carry a path even when a download URL is absent.
        if (message.role === 'user' && /^<(?:attachment|workspace-attachment)[\s>]/.test(part.text)) {
          for (const match of part.text.matchAll(/文件已保存到当前用户工作区：([^\n<]+)/g)) add(match[1]?.trim());
        }
      }
      const tool: unknown = part.type === 'tool-invocation' ? part.toolInvocation : part;
      if (!record(tool) || typeof tool.toolName !== 'string') continue;
      const fileOperation = /^(?:mastra_workspace_)?(?:read_file|write_file|edit_file)$/.test(tool.toolName);
      const returnedFiles = /^(?:present|office_convert|office_render|office_recalculate)$/.test(tool.toolName);
      if (!fileOperation && !returnedFiles) continue;
      if (tool.state !== 'result' && tool.state !== 'output-available') continue;
      const output = tool.result ?? tool.output;
      if (record(output) && (output.isError === true || output.success === false || output.error)) continue;
      if (returnedFiles) {
        if (record(output) && Array.isArray(output.files))
          for (const file of output.files) if (record(file)) add(file.path);
        continue;
      }
      const input = tool.args ?? tool.input;
      if (record(input)) add(input.path);
    }
  }
  return [...paths];
}

/** Read every page: the transcript UI initially loads only its newest 40 messages. */
export async function loadConversationFilePaths(
  client: MastraClient,
  agentId: string,
  threadId: string,
  requestContext?: Record<string, unknown>,
  signal?: AbortSignal,
) {
  const paths = new Set<string>();
  let previousLastId: string | undefined;
  for (let page = 0; ; page++) {
    signal?.throwIfAborted();
    const result = await client.listThreadMessages(threadId, {
      agentId,
      requestContext,
      page,
      perPage: 100,
      orderBy: { field: 'createdAt', direction: 'ASC' },
    });
    signal?.throwIfAborted();
    const messages: MastraDBMessage[] = result.messages;
    for (const path of conversationFilePaths(messages)) paths.add(path);
    if (!result.hasMore || messages.length === 0) return [...paths];
    const lastId = messages.at(-1)?.id;
    if (lastId === previousLastId) throw new Error('File history pagination did not advance');
    previousLastId = lastId;
  }
}
