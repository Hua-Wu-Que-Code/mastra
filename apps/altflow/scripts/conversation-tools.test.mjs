import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Agent } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { Workspace } from '@mastra/core/workspace';
import { z } from 'zod';
import { conversationToolPolicy } from '../src/mastra/tools/conversation-policy.ts';
import { turnFileChangesProcessor } from '../src/mastra/services/turn-file-changes.ts';
import { UserFilesystem } from '../src/mastra/user-filesystem.ts';
import { setup } from './storage-fixture.mjs';
import { modelServer, runOptions, toolResults } from './tool-fixture.mjs';

const names = body => body.tools?.map(tool => tool.function.name) ?? [];
const simpleTool = (id, execute = async () => 'ok') =>
  createTool({
    id,
    description: id,
    inputSchema: z.object({}),
    execute,
  });

test('model requests gate tools per user request and expose Office tools after a successful skill activation', async t => {
  const edge = await modelServer(t);
  const agent = new Agent({
    id: 'gates',
    name: 'Gates',
    model: edge.model,
    instructions: 'Use tools when requested.',
    tools: {
      countText: simpleTool('count-text'),
      office_convert: simpleTool('office_convert'),
      skill: createTool({
        id: 'skill',
        description: 'Activate a skill',
        inputSchema: z.object({ name: z.string() }),
        execute: async () => 'Office skill instructions',
      }),
    },
    inputProcessors: [conversationToolPolicy()],
  });
  await agent.generate('继续分析小说。');
  assert.equal(names(edge.requests.at(-1)).includes('countText'), false);
  assert.equal(names(edge.requests.at(-1)).includes('office_convert'), false);
  await agent.generate('统计这段有多少个字。');
  assert.ok(names(edge.requests.at(-1)).includes('countText'));
  await agent.generate('将这个 Word 文件转换为 PDF。');
  assert.ok(names(edge.requests.at(-1)).includes('office_convert'));
  edge.responses.push({ calls: [{ name: 'skill', args: { name: 'office' } }] }, { text: 'Verified.' });
  const start = edge.requests.length;
  await agent.generate('检查这个附件。', { maxSteps: 2 });
  assert.equal(names(edge.requests[start]).includes('office_convert'), false);
  assert.ok(names(edge.requests[start + 1]).includes('office_convert'));
});

test('repeated calls yield model-only guidance and oversized output can be read in pages', async t => {
  const edge = await modelServer(t);
  const full = 'begin' + '0123456789'.repeat(3_000) + 'end';
  const agent = new Agent({
    id: 'spill',
    name: 'Spill',
    model: edge.model,
    instructions: 'Read a result.',
    tools: { lookup: simpleTool('lookup', async () => full) },
    inputProcessors: [conversationToolPolicy()],
  });
  edge.setHandler(body => {
    const messages = body.messages.filter(message => message.role === 'tool');
    if (messages.length < 3) return { calls: [{ name: 'lookup', args: {} }] };
    if (messages.length === 3) {
      const id = /using id ([a-f0-9]{32})/.exec(messages.at(-1).content)?.[1];
      if (!id) return { text: 'No preview ID.' };
      return { calls: [{ name: 'read_tool_result', args: { id, offset: 8000 } }] };
    }
    return { text: 'Read from a page.' };
  });
  const result = await agent.generate('Look up the report.', { maxSteps: 5 });
  const repeated = edge.requests[3];
  assert.ok(names(repeated).includes('read_tool_result'));
  assert.ok(
    repeated.messages.some(message => message.role === 'system' && /3 times in succession/.test(message.content)),
  );
  assert.ok(
    repeated.messages.filter(message => message.role === 'tool').every(message => message.content.length < 4_000),
  );
  const outputs = toolResults(result);
  assert.ok(outputs[0].payload.result === full);
  assert.deepEqual(outputs[3].payload.result, { text: full.slice(8000, 16000), nextOffset: 16000 });
  assert.equal(result.text, 'Read from a page.');
});

test('agent mutations store first and last snapshots on the authenticated conversation turn', async t => {
  const fixture = await setup(t);
  await fixture.store.write('alice', '/draft.md', Buffer.from('before'));
  const edge = await modelServer(t);
  const storage = new LibSQLStore({ id: 'memory', url: ':memory:' });
  const agent = new Agent({
    id: 'changes',
    name: 'Changes',
    model: edge.model,
    instructions: 'Edit the document.',
    memory: new Memory({
      storage,
      options: { generateTitle: false, semanticRecall: false, workingMemory: { enabled: false } },
    }),
    workspace: new Workspace({ filesystem: new UserFilesystem(fixture.store, 'alice') }),
    inputProcessors: [turnFileChangesProcessor()],
  });
  edge.responses.push(
    { calls: [{ name: 'mastra_workspace_write_file', args: { path: '/draft.md', content: 'first edit' } }] },
    { calls: [{ name: 'mastra_workspace_write_file', args: { path: '/draft.md', content: 'final edit' } }] },
    { text: 'Done.' },
  );
  const thread = 'changes-owned';
  await agent.generate('Rewrite my draft.', { ...runOptions(thread), maxSteps: 3 });
  const reopened = await fixture.reopen();
  const changes = await reopened.turnChanges('alice', thread);
  assert.equal(changes.length, 1);
  assert.deepEqual(
    { ...changes[0], turn: undefined },
    { turn: undefined, path: '/draft.md', name: 'draft.md', kind: 'modified', hasDiff: true },
  );
  assert.deepEqual(await reopened.turnDiff('alice', thread, changes[0].turn, '/draft.md'), {
    before: 'before',
    after: 'final edit',
  });
  assert.deepEqual(await reopened.turnChanges('bob', thread), []);
  assert.deepEqual(await reopened.turnChanges('alice', 'other-thread'), []);
});
