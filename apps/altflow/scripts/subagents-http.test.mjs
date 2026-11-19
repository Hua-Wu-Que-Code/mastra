import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { Hono } from 'hono';
import { createAltFlowAuth } from '../src/mastra/altflow-auth.ts';
import { conversationStatusRoute } from '../src/mastra/routes/conversation-status.ts';
import { subagentRoutes } from '../src/mastra/routes/subagents.ts';
import { AccountPreferences } from '../src/mastra/services/account-preferences.ts';
import { fixture, runOptions, context } from './tool-fixture.mjs';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(check) {
  const deadline = Date.now() + 5000;
  while (!(await check())) {
    assert.ok(Date.now() < deadline);
    await delay(20);
  }
}
async function setup(t) {
  const f = await fixture(t);
  await f.agent.generate('Initialize root', runOptions());
  const auth = createServer((req, res) => {
    const owner = req.headers.authorization?.match(/^Bearer (alice|bob)$/)?.[1];
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify(
        owner
          ? {
              code: 0,
              message: '',
              data: { userId: owner, username: owner, role: 'creator' },
            }
          : { code: 40100, message: 'expired', data: null },
      ),
    );
  });
  await new Promise(resolve => auth.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => auth.close(resolve)));
  const accounts = createAltFlowAuth({
    backendUrl: `http://127.0.0.1:${auth.address().port}`,
    origins: ['http://studio.test'],
    secureCookies: false,
  });
  const app = new Hono();
  const preferences = new AccountPreferences(`file:${f.dir}/preferences.db`, f.memoryStore);
  await preferences.init();
  t.after(() => preferences.close());
  for (const route of subagentRoutes(
    f.tree.runtime,
    accounts,
    ['http://studio.test'],
    () => f.agent,
    actor => preferences.conversationOptions(actor.owner, actor.resourceId, 'creator-agent', actor.root),
  ))
    app.on(route.method, route.path, route.handler);
  const statusRoute = conversationStatusRoute(() => f.agent, accounts, ['http://studio.test']);
  app.on(statusRoute.method, statusRoute.path, statusRoute.handler);
  const statusRequest = (owner, origin) =>
    app.request('/altflow/conversations/status', {
      headers: { ...(owner ? { authorization: `Bearer ${owner}` } : {}), ...(origin ? { origin } : {}) },
    });
  const request = (owner, child, action, headers = {}, root = 'alice-thread') =>
    app.request(`/altflow/subagents?${new URLSearchParams({ root, ...(child ? { child } : {}) })}`, {
      method: action ? 'POST' : 'GET',
      headers: {
        ...(owner ? { authorization: `Bearer ${owner}` } : {}),
        ...headers,
      },
      body: action ? JSON.stringify(action) : undefined,
    });
  return { ...f, request, statusRequest, preferences };
}
test('opening a saved tree restores the conversation reasoning level for subsequent children', async t => {
  const f = await setup(t);
  await f.preferences.write('alice', 'altflow:alice', {
    kind: 'thread',
    id: JSON.stringify(['creator-agent', 'alice-thread']),
    patch: { modelSettings: { providerOptions: { altflow: { reasoningLevel: 'high' } } } },
  });
  assert.equal((await f.request('alice')).status, 200);
  const actor = await f.tree.runtime.actor(context('alice'), 'alice-thread');
  await f.tree.runtime.spawn(actor, { name: 'worker', description: 'Worker', prompt: 'Continue.' });
  await until(async () => (await f.treeStore.read('alice', actor.root)).children[0]?.state === 'completed');
  assert.equal((await f.treeStore.read('alice', actor.root)).children[0].reasoningLevel, 'high');
});
test('resetting a saved reasoning preference clears the previous tree attachment', async t => {
  const f = await setup(t);
  const address = { kind: 'thread', id: JSON.stringify(['creator-agent', 'alice-thread']) };
  await f.preferences.write('alice', 'altflow:alice', {
    ...address,
    patch: { modelSettings: { providerOptions: { altflow: { reasoningLevel: 'high' } } } },
  });
  assert.equal((await f.request('alice')).status, 200);
  await f.preferences.write('alice', 'altflow:alice', { ...address, patch: { modelSettings: null } });
  assert.equal((await f.request('alice')).status, 200);
  const actor = await f.tree.runtime.actor(context('alice'), 'alice-thread');
  await f.tree.runtime.spawn(actor, { name: 'worker', description: 'Worker', prompt: 'Use defaults.' });
  await until(async () => (await f.treeStore.read('alice', actor.root)).children[0]?.state === 'completed');
  assert.equal((await f.treeStore.read('alice', actor.root)).children[0].reasoningLevel, undefined);
});
test('tree HTTP exposes actual child messages and usage only to the owning root account', async t => {
  const f = await setup(t);
  const actor = await f.tree.runtime.actor(context('alice'), 'alice-thread');
  f.setHandler(body =>
    JSON.stringify(body.messages).includes('Your name is worker')
      ? { text: 'ACTUAL-CHILD-RESULT' }
      : { text: 'Received' },
  );
  await f.tree.runtime.spawn(actor, {
    name: 'worker',
    description: 'Source research',
    prompt: 'Find a source',
  });
  await until(async () => (await f.treeStore.read('alice', 'alice-thread')).children[0]?.state === 'completed');
  const id = (await f.treeStore.read('alice', 'alice-thread')).children[0].id;
  const snapshot = await (await f.request('alice', id)).json();
  assert.equal(snapshot.children[0].totalTokens, 15);
  assert.ok(snapshot.children[0].elapsedMs >= 0);
  assert.ok(snapshot.messages.some(message => message.text === 'ACTUAL-CHILD-RESULT'));
  assert.ok(
    snapshot.messages.some(message =>
      message.content.parts.some(part => part.type === 'text' && part.text === 'ACTUAL-CHILD-RESULT'),
    ),
  );
  assert.equal((await f.request('bob', id)).status, 404);
  assert.equal((await f.request(undefined, id)).status, 401);
  assert.equal((await f.request('alice', 'foreign-child')).status, 404);
  assert.equal(
    (await f.request('alice', id, undefined, {}, id)).status,
    404,
    'Private child cannot be treated as an ordinary root',
  );
  assert.equal((await f.request('alice', id)).headers.get('Cache-Control'), 'no-store');
});
test('child HTTP continuation works with teamwork off and remains ownership checked and CSRF protected', async t => {
  const f = await setup(t);
  f.setTeamEnabled(false);
  const actor = await f.tree.runtime.actor(context('alice'), 'alice-thread');
  await f.tree.runtime.spawn(actor, {
    name: 'worker',
    description: 'Work',
    prompt: 'Start',
  });
  await until(async () => (await f.treeStore.read('alice', 'alice-thread')).children[0]?.state === 'completed');
  const id = (await f.treeStore.read('alice', 'alice-thread')).children[0].id;
  assert.equal((await f.request('bob', id, { action: 'interrupt' })).status, 404);
  assert.equal(
    (await f.request('alice', id, { action: 'prompt', prompt: 'Continue' }, { origin: 'http://evil.test' })).status,
    403,
  );
  assert.equal(
    (await f.request(undefined, id, { action: 'interrupt' }, { cookie: 'altflow_studio_token=alice' })).status,
    403,
  );
  assert.equal(
    (
      await f.request('alice', id, {
        action: 'prompt',
        prompt: 'Continue with source B',
      })
    ).status,
    200,
  );
  await until(async () => (await f.treeStore.read('alice', 'alice-thread')).children[0]?.state === 'completed');
  const saved = await (await f.request('alice', id)).json();
  assert.ok(saved.messages.some(message => message.role === 'user' && message.text === 'Continue with source B'));
  assert.equal((await f.request('alice', id, { action: 'interrupt' })).status, 200);
  assert.equal(
    (
      await f.request('alice', id, {
        action: 'prompt',
        prompt: 'x'.repeat(150000),
      })
    ).status,
    413,
  );
  assert.equal(
    (
      await f.request('alice', id, {
        action: 'prompt',
        prompt: 'ok',
        resourceId: 'altflow:bob',
      })
    ).status,
    400,
  );
});

test('sidebar status follows real root execution and never exposes another account', async t => {
  const f = await setup(t);
  assert.equal((await f.statusRequest()).status, 401);
  assert.equal((await f.statusRequest('alice', 'http://other.test')).status, 403);
  let release;
  let started;
  const waiting = new Promise(resolve => {
    release = resolve;
  });
  const active = new Promise(resolve => {
    started = resolve;
  });
  f.setHandler(async () => {
    started();
    await waiting;
    return { text: 'Finished.' };
  });
  const output = await f.agent.stream('A long answer', runOptions());
  const done = output.consumeStream();
  try {
    await active;
    assert.deepEqual(await (await f.statusRequest('alice')).json(), { running: ['alice-thread'] });
    assert.deepEqual(await (await f.statusRequest('bob')).json(), { running: [] });
  } finally {
    release();
  }
  await done;
  await until(async () => (await (await f.statusRequest('alice')).json()).running.length === 0);
});

test('sidebar does not show a generating spinner while a question is waiting for the user', async t => {
  const f = await setup(t);
  f.responses.push({
    calls: [{ name: 'ask_user', args: { question: 'Which topic?', options: [{ label: 'A' }, { label: 'B' }] } }],
  });
  const output = await f.agent.stream('Ask before continuing.', runOptions());
  await output.consumeStream();
  assert.equal(output.status, 'suspended');
  assert.deepEqual(await (await f.statusRequest('alice')).json(), { running: [] });
});
