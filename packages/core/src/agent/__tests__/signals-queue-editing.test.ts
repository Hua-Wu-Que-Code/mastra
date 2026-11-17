import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Agent } from '../agent';
import { AgentThreadStreamRuntime, agentThreadStreamRuntime } from '../thread-stream-runtime';
import { createBlockingFirstTextStreamModel, ControlledLeasePubSub } from './signals-test-utils';

describe('Agent queue editing', () => {
  beforeEach(() => agentThreadStreamRuntime.resetForTests());

  it.each([false, true])('changes actual execution order with remote queue editor=%s', async remote => {
    const scope = { resourceId: 'queue-editor', threadId: 'queue-editor' };
    const { model, releaseFirst, getStreamCount } = createBlockingFirstTextStreamModel('first', 'next');
    const pubsub = new ControlledLeasePubSub();
    const follower = new AgentThreadStreamRuntime();
    const agent = new Agent({ id: 'queue-editor', name: 'Queue editor', instructions: 'Test', model, pubsub });
    const stream = await agent.stream('initial', { memory: { resource: scope.resourceId, thread: scope.threadId } });
    try {
      await vi.waitFor(() => expect(getStreamCount()).toBe(1));
      const first = agent.queueMessage('first queued request', scope);
      const second = agent.queueMessage('second queued request', scope);
      await Promise.all([first.accepted, second.accepted]);
      const target = { ...scope, signalId: second.signal.id, action: 'move-up' as const };
      await expect(
        remote ? follower.updateQueuedMessage(agent, target, pubsub) : agent.updateQueuedMessage(target),
      ).resolves.toEqual({ updated: true });
      releaseFirst();
      await stream.text;
      await vi.waitFor(() => expect(getStreamCount()).toBe(3));
      expect(JSON.stringify(model.doStreamCalls[1]?.prompt)).toContain('second queued request');
      expect(JSON.stringify(model.doStreamCalls[1]?.prompt)).not.toContain('first queued request');
      expect(JSON.stringify(model.doStreamCalls[2]?.prompt)).toContain('first queued request');
    } finally {
      releaseFirst();
    }
  });

  it('steers with the original queued signal once and leaves other queued turns alone', async () => {
    const scope = { resourceId: 'queue-steer', threadId: 'queue-steer' };
    const { model, releaseFirst, getStreamCount } = createBlockingFirstTextStreamModel('first', 'next');
    const agent = new Agent({ id: 'queue-steer', name: 'Queue steer', instructions: 'Test', model });
    const stream = await agent.stream('initial', { memory: { resource: scope.resourceId, thread: scope.threadId } });
    try {
      await vi.waitFor(() => expect(getStreamCount()).toBe(1));
      const queued = agent.queueMessage('steer this request', scope);
      const survivor = agent.queueMessage('remaining queued request', scope);
      await Promise.all([queued.accepted, survivor.accepted]);
      await expect(
        agent.updateQueuedMessage({ ...scope, signalId: queued.signal.id, action: 'steer' }),
      ).resolves.toEqual({ updated: true });
      await expect(
        agent.updateQueuedMessage({ ...scope, signalId: queued.signal.id, action: 'steer' }),
      ).resolves.toEqual({ updated: false });
      releaseFirst();
      await stream.text;
      await vi.waitFor(() => expect(getStreamCount()).toBe(3));
      await vi.waitFor(() => expect(agentThreadStreamRuntime.getActiveThreadRunId(scope)).toBeUndefined());
      expect(JSON.stringify(model.doStreamCalls[1]?.prompt).split('steer this request')).toHaveLength(2);
      expect(JSON.stringify(model.doStreamCalls[1]?.prompt)).not.toContain('remaining queued request');
      expect(JSON.stringify(model.doStreamCalls[2]?.prompt)).toContain('remaining queued request');
    } finally {
      releaseFirst();
    }
  });
});
