import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Agent } from '@mastra/core/agent';
import { Mastra } from '@mastra/core/mastra';
import { SpanType, TracingEventType } from '@mastra/core/observability';
import { Observability } from '@mastra/observability';
import { MastraCompositeStore } from '@mastra/core/storage';
import { createTool } from '@mastra/core/tools';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { z } from 'zod';
import { ContextCompaction } from '../src/mastra/context-compaction.ts';
import { contextPolicy } from '../src/mastra/context-policy.ts';
import { ModelHubGateway } from '../src/mastra/modelhub-gateway.ts';
import { modelHubFixture } from './modelhub-fixture.mjs';

const isSummary = request =>
  request.body.messages.at(-1)?.content?.includes('You are now acting as a compaction engine');
async function setup(t, trace = false) {
  const events = [];
  const observability = trace
    ? new Observability({
        configs: {
          default: {
            serviceName: 'context-test',
            exporters: [
              {
                name: 'capture',
                exportTracingEvent: async event => {
                  events.push(event);
                },
                flush: async () => {},
                shutdown: async () => {},
              },
            ],
          },
        },
      })
    : undefined;
  const hub = await modelHubFixture();
  const dir = await mkdtemp(join(tmpdir(), 'context-checkpoint-'));
  const db = new LibSQLStore({
    id: 'isolated',
    url: `file:${join(dir, 'test.db')}`,
  });
  const storage = new MastraCompositeStore({ id: 'test', default: db });
  await storage.init();
  const store = await storage.getStore('memory');
  await store.saveThread({
    thread: {
      id: 'thread',
      resourceId: 'owner',
      title: 'test',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: { unrelated: 'keep' },
    },
  });
  const gateway = new ModelHubGateway({ apiKey: 'test', baseURL: hub.baseURL });
  t.after(async () => {
    await hub.close();
    await storage.close();
    await rm(dir, { recursive: true, force: true });
  });
  const agent = async (tools = {}, modelId = 'deepseek-v4-pro', memoryOptions = {}) => {
    const compaction = new ContextCompaction({ gateway, storage });
    const instance = new Agent({
      id: 'test',
      name: 'test',
      instructions: 'Preserve the original system instructions.',
      model: await gateway.resolveLanguageModel({ modelId }),
      memory: new Memory({
        storage,
        options: {
          lastMessages: Number.MAX_SAFE_INTEGER,
          semanticRecall: false,
          generateTitle: false,
          ...memoryOptions,
        },
      }),
      inputProcessors: [compaction],
      outputProcessors: [compaction],
      errorProcessors: [compaction],
      tools,
    });
    if (observability) new Mastra({ agents: { test: instance }, storage, observability });
    return instance;
  };
  const seed = async (count = 18, size = 18000) => {
    await store.saveMessages({
      messages: Array.from({ length: count }, (_, i) => ({
        id: `old-${i}`,
        threadId: 'thread',
        resourceId: 'owner',
        role: i % 2 ? 'assistant' : 'user',
        createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, i)),
        content: {
          format: 2,
          parts: [
            {
              type: 'text',
              text: `old-${i}: original fact ${'abcd'.repeat(size / 4)}`,
            },
          ],
        },
      })),
    });
  };
  return { hub, store, agent, seed, storage, gateway, events };
}
const options = {
  memory: { thread: 'thread', resource: 'owner' },
  maxSteps: 4,
};

test('DSH pressure policy reserves output, headroom and recent verbatim history', () => {
  assert.deepEqual(contextPolicy(1000000), {
    window: 131072,
    output: 8192,
    threshold: 57344,
    retain: 19660,
  });
});

for (const mode of ['generate', 'stream'])
  test(`${mode}: compacts old history and reloads its durable checkpoint`, async t => {
    const { hub, store, agent, seed } = await setup(t);
    await seed();
    const first = await (await agent())[mode]('CURRENT TASK: finish the original work', options);
    if (mode === 'stream') await first.consumeStream();
    assert.equal(await first.text, 'verified');
    assert.equal(hub.state.requests.filter(isSummary).length, 1);
    const main = hub.state.requests.filter(request => !isSummary(request)).at(-1).body;
    assert.match(JSON.stringify(main.messages), /<compacted-summary>/);
    assert.match(JSON.stringify(main.messages), /CURRENT TASK: finish the original work/);
    assert.match(JSON.stringify(main.messages), /old-17: original fact/);
    assert.doesNotMatch(JSON.stringify(main.messages), /old-0: original fact/);
    assert.match(JSON.stringify(main.messages), /Preserve the original system instructions/);
    const saved = await store.getThreadById({
      threadId: 'thread',
      resourceId: 'owner',
    });
    assert.equal(saved.metadata.unrelated, 'keep');
    assert.ok(saved.metadata.dshContext.checkpoint.covered > 0);
    assert.ok(saved.metadata.dshContext.measurement.input >= 0);
    const original = await store.listMessages({
      threadId: 'thread',
      resourceId: 'owner',
      perPage: 100,
    });
    assert.ok(original.messages.some(message => message.id === 'old-0'));
    const next = await (await agent())[mode]('NEXT TASK: continue', options);
    if (mode === 'stream') await next.consumeStream();
    assert.equal(
      hub.state.requests.filter(isSummary).length,
      1,
      'fresh processor reloads, rather than re-summarizing old messages',
    );
    assert.match(JSON.stringify(hub.state.requests.at(-1).body.messages), /<compacted-summary>/);
  });

test('compaction stays billable but is explicitly separated from the main model lifecycle', async t => {
  const { agent, seed, events } = await setup(t, true);
  await seed();
  const result = await (await agent()).generate('Continue working', options);
  assert.equal(result.text, 'verified');
  const spans = events.filter(event => event.type === TracingEventType.SPAN_ENDED).map(event => event.exportedSpan);
  const main = spans.find(span => span.type === SpanType.MODEL_GENERATION && span.metadata?.agentMainLoop);
  assert.ok(main, 'durable main-loop attribution is exported for UI accounting');
  const auxiliary = spans.find(
    span => span.type === SpanType.MODEL_INFERENCE && span.metadata?.auxiliary === 'compaction',
  );
  assert.ok(auxiliary);
  assert.equal(auxiliary.attributes.usage.inputTokens, 100);
  assert.equal(auxiliary.attributes.usage.inputDetails.cacheRead, 80);
  assert.equal(auxiliary.attributes.usage.outputTokens, 1);
});

test('long tool output is pruned only on the model projection and retains its complete tool pair', async t => {
  const { hub, store, agent } = await setup(t);
  hub.state.toolCallText = 'read';
  const large = '头'.repeat(4096) + '中'.repeat(250000) + '尾'.repeat(1024);
  const tool = createTool({
    id: 'countText',
    description: 'Read a large file',
    inputSchema: z.object({ text: z.string() }),
    outputSchema: z.object({ text: z.string() }),
    execute: async () => ({ text: large }),
  });
  const result = await (await agent({ countText: tool })).generate('Read the file', options);
  assert.equal(result.text, 'verified');
  assert.equal(hub.state.requests.filter(isSummary).length, 0);
  const main = hub.state.requests.at(-1).body;
  const toolMessage = main.messages.find(message => message.role === 'tool');
  assert.match(toolMessage.content, /tool result middle pruned/);
  assert.match(toolMessage.content, /头/);
  assert.match(toolMessage.content, /尾/);
  assert.ok(main.messages.some(message => message.tool_calls?.some(call => call.id === toolMessage.tool_call_id)));
  const saved = await store.listMessages({
    threadId: 'thread',
    resourceId: 'owner',
    perPage: 100,
  });
  assert.ok(JSON.stringify(saved.messages).includes(large), 'stored transcript retains the full tool output');
});

for (const failure of ['empty', 'truncated'])
  test(`${failure} summaries never overwrite history or land a checkpoint`, async t => {
    const { hub, store, agent, seed } = await setup(t);
    await seed();
    if (failure === 'empty') hub.state.summaryText = '';
    else hub.state.summaryFinish = 'length';
    await assert.rejects((await agent()).generate('Keep working', options), /Context could not be compacted safely/);
    assert.equal(hub.state.requests.filter(isSummary).length, 2);
    const saved = await store.getThreadById({
      threadId: 'thread',
      resourceId: 'owner',
    });
    assert.equal(saved.metadata.dshContext?.checkpoint, undefined);
    const history = await store.listMessages({
      threadId: 'thread',
      resourceId: 'owner',
      perPage: 100,
    });
    assert.ok(history.messages.some(message => message.id === 'old-0'));
  });

test('confirmed upstream overflow gets one compaction retry with a changed request', async t => {
  const { hub, agent, seed } = await setup(t);
  await seed(6, 8000);
  hub.state.rejectContextOnce = true;
  const result = await (await agent()).generate('Continue after overflow', options);
  assert.equal(result.text, 'verified');
  assert.equal(hub.state.requests.filter(isSummary).length, 1);
  assert.match(JSON.stringify(hub.state.requests.at(-1).body.messages), /<compacted-summary>/);
  assert.doesNotMatch(JSON.stringify(hub.state.requests[0].body.messages), /<compacted-summary>/);
});

test('switching model uses the destination budget and summarizes with the last answered route', async t => {
  const { hub, agent, seed } = await setup(t);
  await (await agent()).generate('Initial task', options);
  await seed(10, 18000);
  hub.state.info.data.find(row => row.model_name === 'internal-qwen-route').model_info.max_input_tokens = 100000;
  // A fresh gateway snapshots the updated model/info, as it does after its cache expires.
  const now = Date.now();
  t.mock.timers.enable({ apis: ['Date'], now });
  t.mock.timers.setTime(now + 60001);
  const result = await (await agent({}, 'qwen3.8-max')).generate('Switch and continue', options);
  assert.equal(result.text, 'verified');
  const summary = hub.state.requests.find(isSummary).body;
  assert.equal(summary.model, 'internal-deepseek-route');
  assert.equal(hub.state.requests.at(-1).body.model, 'internal-qwen-route');
  assert.match(JSON.stringify(hub.state.requests.at(-1).body.messages), /<compacted-summary>/);
});

test('cancelled summarization never commits a checkpoint or sends a continuation', async t => {
  const { hub, store, agent, seed } = await setup(t);
  await seed();
  const controller = new AbortController();
  let reached;
  const started = new Promise(resolve => {
    reached = resolve;
  });
  hub.state.onRequest = body => {
    if (body.messages.at(-1)?.content?.includes('You are now acting as a compaction engine')) reached();
  };
  hub.state.blocked = true;
  const pending = (await agent()).generate('Cancel this compaction', {
    ...options,
    abortSignal: controller.signal,
  });
  await started;
  controller.abort();
  hub.state.blocked = false;
  await pending.catch(() => {});
  const saved = await store.getThreadById({
    threadId: 'thread',
    resourceId: 'owner',
  });
  assert.equal(saved.metadata.dshContext?.checkpoint, undefined);
  assert.equal(hub.state.requests.filter(request => !isSummary(request)).length, 0);
});

test('memory off excludes stored history, working notes and observations while retaining stored records', async t => {
  const { hub, store, agent, seed, gateway } = await setup(t);
  await seed(4, 64);
  await store.saveResource({ resource: { id: 'owner', workingMemory: 'PRIVATE_WORKING_NOTE', createdAt: new Date(), updatedAt: new Date() } });
  const instance = await agent({}, 'deepseek-v4-pro', {
    workingMemory: { enabled: true, scope: 'resource' },
    observationalMemory: { model: await gateway.resolveLanguageModel({ modelId: 'deepseek-v4-pro' }) },
  });
  const result = await instance.generate('CURRENT TASK ONLY', {
    ...options,
    memory: { ...options.memory, options: { lastMessages: false, semanticRecall: false,
      workingMemory: { enabled: false }, observationalMemory: false } },
  });
  assert.equal(result.text, 'verified');
  const main = hub.state.requests.filter(request => !isSummary(request)).at(-1).body;
  assert.doesNotMatch(JSON.stringify(main), /PRIVATE_WORKING_NOTE|old-0: original fact|updateWorkingMemory/);
  assert.match(JSON.stringify(main.messages), /CURRENT TASK ONLY/);
  const stored = await store.listMessages({ threadId: 'thread', resourceId: 'owner', perPage: 100 });
  assert.ok(stored.messages.some(message => message.id === 'old-0'));
});
