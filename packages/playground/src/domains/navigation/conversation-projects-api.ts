import type { MastraClient } from '@mastra/client-js';
import { t } from '@mastra/playground-ui/lib/i18n';
import { z } from 'zod/v4';

export const organizationSchema = z.object({
  projects: z.array(
    z.object({ id: z.string(), name: z.string(), threads: z.array(z.string()), agentId: z.string().optional() }),
  ),
  projectPins: z.array(z.string()).default([]),
  pinned: z.array(z.string()),
  collapsed: z.array(z.string()),
});
export const organizationResponseSchema = organizationSchema.extend({ revision: z.number().int().nonnegative() });
export type ConversationProject = z.infer<typeof organizationSchema>['projects'][number];
export type ConversationOrganizationState = z.infer<typeof organizationResponseSchema>;
export const organizationCommandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('create'), id: z.string(), name: z.string(), agentId: z.string().optional() }),
  z.object({ type: z.literal('rename'), id: z.string(), name: z.string() }),
  z.object({ type: z.literal('remove'), id: z.string() }),
  z.object({ type: z.literal('pinProject'), id: z.string(), enabled: z.boolean() }),
  z.object({ type: z.literal('pin'), id: z.string(), enabled: z.boolean() }),
  z.object({ type: z.literal('collapse'), id: z.string(), enabled: z.boolean() }),
  z.object({ type: z.literal('move'), threadId: z.string(), projectId: z.string().optional() }),
  z.object({ type: z.literal('forget'), threadId: z.string() }),
  z.object({ type: z.literal('import'), state: organizationSchema }),
]);
export type OrganizationCommand = z.infer<typeof organizationCommandSchema>;

export async function organizationRequest(client: MastraClient, command?: OrganizationCommand) {
  // Custom application routes live at the server root, outside Mastra's reserved API prefix.
  const url = `${client.options.baseUrl.replace(/\/$/, '')}/conversation-projects`;
  const response = await fetch(url, {
    method: command ? 'POST' : 'GET',
    credentials: 'include',
    cache: 'no-store',
    redirect: 'error',
    headers: { ...client.options.headers, 'Content-Type': 'application/json' },
    body: command ? JSON.stringify(command) : undefined,
  });
  const body: unknown = await response.json();
  if (!response.ok) {
    const error = z.object({ error: z.string() }).safeParse(body);
    throw new Error(error.success ? error.data.error : t('Failed to save project changes'));
  }
  return organizationResponseSchema.parse(body);
}
