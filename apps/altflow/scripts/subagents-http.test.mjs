import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { Hono } from 'hono';
import { createAltFlowAuth } from '../src/mastra/altflow-auth.ts';
import { subagentRoutes } from '../src/mastra/routes/subagents.ts';
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
  for (const route of subagentRoutes(f.tree.runtime, accounts, ['http://studio.test'], () => f.agent))
    app.on(route.method, route.path, route.handler);
  const request = (owner, child, action, headers = {}, root = 'alice-thread') =>
    app.request(`/altflow/subagents?${new URLSearchParams({ root, ...(child ? { child } : {}) })}`, {
      method: action ? 'POST' : 'GET',
      headers: {
        ...(owner ? { authorization: `Bearer ${owner}` } : {}),
        ...headers,
      },
      body: action ? JSON.stringify(action) : undefined,
    });
  return { ...f, request };
}
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
test('child HTTP continuation and interruption are ownership checked and CSRF protected', async t => {
  const f = await setup(t);
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
