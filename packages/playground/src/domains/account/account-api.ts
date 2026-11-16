import { t as studioT } from '@mastra/playground-ui/lib/i18n';
import { z } from 'zod';

const sessionSchema = z.object({
  user: z.object({
    id: z.string().min(1),
    name: z.string(),
    email: z.string().optional(),
    role: z.enum(['admin', 'creator', 'user']),
  }),
  permissions: z.array(z.string()),
  resourceId: z.string().min(1),
});
export type AccountSession = z.infer<typeof sessionSchema>;
export type AccountEndpoint = { endpoint: string; apiPrefix: string };
export const accountQueryKey = (target: AccountEndpoint) => ['altflow-account', target.endpoint, target.apiPrefix];
function accountUrl(target: AccountEndpoint, action: string) {
  return `${target.endpoint.replace(/\/$/, '')}/account/${action}`;
}
async function accountRequest(target: AccountEndpoint, action: string, body?: unknown) {
  return fetch(accountUrl(target, action), {
    method: body === undefined ? 'GET' : 'POST',
    credentials: 'include',
    cache: 'no-store',
    redirect: 'error',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
export async function getAccountSession(target: AccountEndpoint) {
  const response = await accountRequest(target, 'session');
  if (response.status === 404) return { status: 'not-mounted' } as const;
  if (response.status === 401) return { status: 'signed-out' } as const;
  if (!response.ok) throw new Error(studioT('Sign-in service unavailable. Please retry.'));
  return { status: 'signed-in', session: sessionSchema.parse(await response.json()) } as const;
}
export async function signIn(target: AccountEndpoint, credentials: { email: string; password: string }) {
  const response = await accountRequest(target, 'sign-in', credentials);
  if (!response.ok) {
    const error = z.object({ error: z.string() }).safeParse(await response.json().catch(() => undefined));
    throw new Error(error.success ? error.data.error : studioT('Sign-in failed. Please retry.'));
  }
  return sessionSchema.parse(await response.json());
}
export async function signOut(target: AccountEndpoint) {
  const response = await accountRequest(target, 'sign-out', {});
  if (!response.ok) throw new Error(studioT('Sign-out failed. Please retry.'));
}
