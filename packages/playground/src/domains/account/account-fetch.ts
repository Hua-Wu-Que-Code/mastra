import { z } from 'zod';
import type { AccountSession } from './account-api';

// These are conversation preferences, not permission to replace an agent's configuration.
const memoryPreferences = z.object({
  lastMessages: z
    .union([z.literal(false), z.number().int().min(0).max(10000), z.literal(Number.MAX_SAFE_INTEGER)])
    .optional(),
  workingMemory: z.object({ enabled: z.boolean() }).optional(),
  observationalMemory: z.boolean().optional(),
  semanticRecall: z.literal(false).optional(),
});
const memoryBody = z.object({
  thread: z.union([z.string(), z.object({ id: z.string() })]).optional(),
  options: memoryPreferences.optional(),
});
const conversationPreferences = z.object({
  memory: memoryBody.optional(),
  disableSubAgents: z.boolean().optional(),
});
const chatBody = conversationPreferences.extend({
  messages: z.unknown(),
  runId: z.string().optional(),
});
const threadMessageBody = z.object({
  message: z.unknown(),
  threadId: z.string(),
  ifIdle: z.object({ streamOptions: conversationPreferences.optional() }).optional(),
});

// Studio normally sends editable run settings. Managed accounts use the preset
// assistant, so send conversation data and bounded preferences; the server independently rejects overrides.
export function createAccountFetch(account: AccountSession, apiPrefix = '/api'): typeof fetch {
  return async (input, init) => {
    const request = new Request(input, { ...init, credentials: 'include' });
    const managed = account.user.role !== 'admin';
    const prefix = '/' + apiPrefix.split('/').filter(Boolean).join('/');
    const pathname = new URL(request.url).pathname;
    const route = prefix === '/' ? pathname : pathname.startsWith(prefix + '/') ? pathname.slice(prefix.length) : '';
    const chat = /^\/agents\/[^/]+\/(stream|generate|stream-until-idle)$/.test(route);
    const threadMessage = /^\/agents\/[^/]+\/(send-message|queue-message)$/.test(route);
    if (!managed || (!chat && !threadMessage) || request.method !== 'POST') return fetch(request);
    if (threadMessage) {
      const parsed = threadMessageBody.parse(await request.clone().json());
      const streamOptions = parsed.ifIdle?.streamOptions;
      const hasPreferences = streamOptions && Object.keys(streamOptions).length > 0;
      const body = {
        message: parsed.message,
        threadId: parsed.threadId,
        resourceId: account.resourceId,
        ...(hasPreferences
          ? {
              ifIdle: {
                streamOptions: {
                  ...streamOptions,
                  ...(streamOptions.memory
                    ? {
                        memory: {
                          ...streamOptions.memory,
                          thread: parsed.threadId,
                          resource: account.resourceId,
                        },
                      }
                    : {}),
                },
              },
            }
          : {}),
      };
      return fetch(new Request(request, { body: JSON.stringify(body) }));
    }
    const parsed = chatBody.parse(await request.clone().json());
    const body = { ...parsed, memory: parsed.memory ? { ...parsed.memory, resource: account.resourceId } : undefined };
    return fetch(new Request(request, { body: JSON.stringify(body) }));
  };
}
