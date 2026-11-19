import type { Agent } from '@mastra/core/agent';
import { registerApiRoute } from '@mastra/core/server';
import { AuthUpstreamError } from '../altflow-auth';
import type { createAltFlowAuth } from '../altflow-auth';

/** A projection of the runtime, shared by every sidebar; never inferred from the selected page. */
export function conversationStatusRoute(
  agent: () => Agent,
  accounts: ReturnType<typeof createAltFlowAuth>,
  origins: string[],
) {
  return registerApiRoute('/altflow/conversations/status', {
    method: 'GET',
    requiresAuth: false,
    handler: async c => {
      c.header('Cache-Control', 'no-store');
      const origin = c.req.header('origin');
      if (origin && !origins.includes(origin)) return c.json({ error: '不允许的请求来源' }, 403);
      try {
        const user = await accounts.authenticate(c.req.raw);
        if (!user) return c.json({ error: '请先登录' }, 401);
        const { resourceId } = accounts.session(user);
        const runtime = agent();
        const active = runtime.listActiveThreadRuns().filter(run => run.resourceId === resourceId);
        // A suspended approval/question blocks its thread but is not generating a reply.
        const suspended = active.length ? (await runtime.listSuspendedRuns({ resourceId })).runs : [];
        const waiting = new Set(suspended.map(run => run.runId));
        const running = active.filter(run => !waiting.has(run.runId));
        return c.json({ running: running.map(run => run.threadId) });
      } catch (error) {
        if (error instanceof AuthUpstreamError) return c.json({ error: error.message }, error.status);
        return c.json({ error: '会话状态暂不可用' }, 503);
      }
    },
  });
}
