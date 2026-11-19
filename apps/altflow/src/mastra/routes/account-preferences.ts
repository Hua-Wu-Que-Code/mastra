import { registerApiRoute } from '@mastra/core/server';
import { z } from 'zod';
import { AuthUpstreamError } from '../altflow-auth';
import type { createAltFlowAuth } from '../altflow-auth';
import type { AccountPreferences } from '../services/account-preferences';
import { PreferenceError, preferenceAddress, preferenceCommand } from '../services/account-preferences';

export function accountPreferenceRoutes(
  store: AccountPreferences,
  accounts: ReturnType<typeof createAltFlowAuth>,
  origins: string[],
) {
  return (['GET', 'POST'] as const).map(method =>
    registerApiRoute('/account-preferences', {
      method,
      requiresAuth: false,
      handler: async c => {
        c.header('Cache-Control', 'no-store');
        try {
          const user = await accounts.authenticate(c.req.raw);
          if (!user) return c.json({ error: '请先登录' }, 401);
          const origin = c.req.header('origin');
          if ((origin && !origins.includes(origin)) || (method !== 'GET' && !c.req.header('authorization') && !origin))
            return c.json({ error: '不允许的请求来源' }, 403);
          if (method === 'GET')
            return c.json(
              await store.read(
                user.id,
                accounts.session(user).resourceId,
                preferenceAddress.parse({ kind: c.req.query('kind'), id: c.req.query('id') }),
              ),
            );
          // Bound streamed bodies too; do not trust Content-Length alone.
          const reader = c.req.raw.body?.getReader();
          const chunks: Uint8Array[] = [];
          let bytes = 0;
          if (reader)
            try {
              while (true) {
                const next = await reader.read();
                if (next.done) break;
                bytes += next.value.length;
                if (bytes > 128 * 1024) {
                  await reader.cancel();
                  return c.json({ error: '设置数据过大' }, 413);
                }
                chunks.push(next.value);
              }
            } finally {
              reader.releaseLock();
            }
          const command = preferenceCommand.parse(JSON.parse(Buffer.concat(chunks).toString('utf8')));
          return c.json(await store.write(user.id, accounts.session(user).resourceId, command));
        } catch (error) {
          if (error instanceof PreferenceError || error instanceof AuthUpstreamError)
            return c.json({ error: error.message }, error.status);
          if (error instanceof z.ZodError || error instanceof SyntaxError)
            return c.json({ error: '设置参数无效' }, 400);
          return c.json({ error: '设置服务暂不可用，请重试' }, 503);
        }
      },
    }),
  );
}
