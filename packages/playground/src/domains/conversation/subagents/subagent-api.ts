import type { MastraDBMessage } from '@mastra/core/agent/message-list';
import { z } from 'zod';
import type { StudioConfig } from '@/domains/configuration/types';

// Validate the stored parts we render. Preserve future parts as data instead of dropping their payload.
const partSchema = z.union([
  z.object({ type: z.literal('text'), text: z.string() }).passthrough(),
  z
    .object({
      type: z.literal('reasoning'),
      reasoning: z.string(),
      details: z
        .array(
          z.union([
            z.object({ type: z.literal('text'), text: z.string(), signature: z.string().optional() }),
            z.object({ type: z.literal('redacted'), data: z.string() }),
          ]),
        )
        .default([]),
    })
    .passthrough(),
  z
    .object({
      type: z.literal('tool-invocation'),
      toolInvocation: z
        .object({
          toolCallId: z.string(),
          toolName: z.string(),
          args: z.unknown(),
          result: z.unknown().optional(),
          state: z.enum([
            'partial-call',
            'call',
            'result',
            'approval-requested',
            'approval-responded',
            'output-error',
            'output-denied',
          ]),
          isError: z.boolean().optional(),
          errorText: z.string().optional(),
        })
        .passthrough(),
    })
    .passthrough(),
  z.object({ type: z.literal('file'), mimeType: z.string(), data: z.string() }).passthrough(),
  z.object({ type: z.literal('step-start') }).passthrough(),
  z
    .object({ type: z.literal('error'), error: z.object({ name: z.string(), message: z.string() }).passthrough() })
    .passthrough(),
  z
    .object({ type: z.string(), data: z.unknown() })
    .passthrough()
    .refine(part => part.type.startsWith('data-'))
    .transform(part => ({ type: `data-${part.type.slice(5)}` as const, data: part.data })),
  z
    .object({ type: z.string() })
    .passthrough()
    .transform(part => ({ type: 'data-unsupported-part' as const, data: part })),
]);
const contentSchema = z.object({
  format: z.literal(2),
  parts: z.array(partSchema),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const childSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  state: z.enum(['preparing', 'queued', 'running', 'completed', 'failed', 'interrupted']),
  startedAt: z.number().optional(),
  finishedAt: z.number().optional(),
  elapsedMs: z.number(),
  totalTokens: z.number().optional(),
  error: z.string().optional(),
});
export const treeSchema = z.object({
  title: z.string(),
  children: z.array(childSchema),
  messages: z.array(
    z.object({
      id: z.string(),
      role: z.enum(['user', 'assistant', 'system', 'signal']),
      content: contentSchema.optional(),
      text: z.string(),
      createdAt: z.string(),
      tools: z.array(z.object({ name: z.string(), state: z.string() })),
    }),
  ),
  hasMore: z.boolean(),
  page: z.number(),
  teamEnabled: z.boolean(),
  tasks: z.array(
    z.object({
      id: z.string(),
      subject: z.string(),
      status: z.enum(['pending', 'in_progress', 'completed']),
      owner: z.string().optional(),
    }),
  ),
});
export type ConversationTreeSnapshot = z.infer<typeof treeSchema>;
export type ChildAgent = z.infer<typeof childSchema>;
type Target = Pick<StudioConfig, 'baseUrl' | 'headers'>;
export async function subagentRequest(
  target: Target,
  root: string,
  child?: string,
  command?: { action: 'prompt'; prompt: string } | { action: 'interrupt' },
  page = 0,
  signal?: AbortSignal,
) {
  const url = new URL(`${target.baseUrl.replace(/\/$/, '')}/altflow/subagents`);
  url.search = new URLSearchParams({ root, ...(child ? { child } : {}), page: String(page) }).toString();
  const response = await fetch(url, {
    method: command ? 'POST' : 'GET',
    headers: { ...target.headers, ...(command ? { 'Content-Type': 'application/json' } : {}) },
    credentials: 'include',
    cache: 'no-store',
    redirect: 'error',
    signal,
    body: command ? JSON.stringify(command) : undefined,
  });
  if (!response.ok) {
    const error = z.object({ error: z.string() }).safeParse(await response.json().catch(() => undefined));
    throw new Error(error.success ? error.data.error : `HTTP ${response.status}`);
  }
  return command ? undefined : treeSchema.parse(await response.json());
}

export function childMessages(snapshot: ConversationTreeSnapshot | undefined): MastraDBMessage[] {
  return (snapshot?.messages ?? []).map(message => ({
    id: message.id,
    role: message.role,
    createdAt: new Date(message.createdAt),
    content: message.content ?? { format: 2, parts: [{ type: 'text', text: message.text }] },
  }));
}
