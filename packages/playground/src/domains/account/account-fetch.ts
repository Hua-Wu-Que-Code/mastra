import { z } from 'zod';
import type { AccountSession } from './account-api';

const chatBody = z.object({
  messages: z.unknown(),
  runId: z.string().optional(),
  memory: z.object({ thread: z.union([z.string(), z.object({ id: z.string() })]).optional() }).optional(),
});

const threadMessageBody = z.object({ message: z.unknown(), threadId: z.string() });

// Studio normally sends editable run settings. Managed accounts use the preset
// assistant, so send only conversation data; the server independently rejects overrides.
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
      return fetch(new Request(request, { body: JSON.stringify({ ...parsed, resourceId: account.resourceId }) }));
    }
    const parsed = chatBody.parse(await request.clone().json());
    const body = { ...parsed, memory: parsed.memory ? { ...parsed.memory, resource: account.resourceId } : undefined };
    return fetch(new Request(request, { body: JSON.stringify(body) }));
  };
}
