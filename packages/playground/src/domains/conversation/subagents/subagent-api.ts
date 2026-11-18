import { z } from 'zod';
import type { StudioConfig } from '@/domains/configuration/types';

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
      role: z.string(),
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
