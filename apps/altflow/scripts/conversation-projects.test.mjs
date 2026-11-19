import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createClient } from '@libsql/client';
import { LibSQLStore } from '@mastra/libsql';
import { Hono } from 'hono';
import { createAltFlowAuth } from '../src/mastra/altflow-auth.ts';
import { conversationProjectRoutes } from '../src/mastra/routes/conversation-projects.ts';
import { ConversationProjects } from '../src/mastra/services/conversation-projects.ts';

async function setup(t) {
  const dir = await mkdtemp(join(tmpdir(), 'conversation-projects-'));
  const memoryStore = new LibSQLStore({
    id: 'projects-test',
    url: `file:${join(dir, 'memory.db')}`,
  });
  await memoryStore.init();
  const memory = await memoryStore.getStore('memory');
  for (const [id, owner] of [
    ['chat-a', 'alice'],
    ['chat-b', 'bob'],
    ['chat-c', 'alice'],
  ])
    await memory.saveThread({
      thread: {
        id,
        resourceId: `altflow:${owner}`,
        title: id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  const database = `file:${join(dir, 'projects.db')}`;
  let store = new ConversationProjects(database, memory);
  await store.init();
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
  const accounts = createAltFlowAuth({
    backendUrl: `http://127.0.0.1:${auth.address().port}`,
    origins: ['http://studio.test'],
    secureCookies: false,
  });
  const mount = () => {
    const fresh = new Hono();
    for (const route of conversationProjectRoutes(store, accounts, ['http://studio.test']))
      fresh.on(route.method, route.path, route.handler);
    return fresh;
  };
  let current = mount();
  t.after(async () => {
    store.close();
    await memoryStore.close();
    await new Promise(resolve => auth.close(resolve));
    await rm(dir, { recursive: true, force: true });
  });
  return {
    memory,
    faultDatabase: () => createClient({ url: `file:${join(dir, 'memory.db')}` }),
    async request(owner, command, extraHeaders = {}) {
      return current.request('/conversation-projects', {
        method: command ? 'POST' : 'GET',
        headers: {
          authorization: `Bearer ${owner}`,
          'Content-Type': 'application/json',
          ...extraHeaders,
        },
        body: command ? JSON.stringify(command) : undefined,
      });
    },
    async reopen() {
      store.close();
      store = new ConversationProjects(database, memory);
      await store.init();
      current = mount();
    },
  };
}

test('projects, memberships and pins survive another session and restart, and cannot cross accounts', async t => {
  const f = await setup(t);
  const create = {
    type: 'create',
    id: 'writing',
    name: 'Writing',
    agentId: 'creator-agent',
  };
  assert.equal((await f.request('alice', create)).status, 200);
  assert.equal(
    (
      await f.request('alice', {
        type: 'move',
        threadId: 'chat-a',
        projectId: 'writing',
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await f.request('alice', {
        type: 'pinProject',
        id: 'writing',
        enabled: true,
      })
    ).status,
    200,
  );
  assert.equal((await f.request('alice', { type: 'pin', id: 'chat-a', enabled: true })).status, 200);
  assert.equal((await f.request('bob', { type: 'rename', id: 'writing', name: 'stolen' })).status, 404);
  assert.equal((await f.request('bob', { ...create, name: 'Bob writing' })).status, 200);
  assert.equal(
    (
      await f.request('bob', {
        type: 'move',
        threadId: 'chat-a',
        projectId: 'writing',
      })
    ).status,
    404,
  );
  assert.equal((await f.request('bob', { type: 'pin', id: 'chat-a', enabled: true })).status, 404);
  await f.reopen();
  const state = await (await f.request('alice')).json();
  assert.equal(state.projects[0].name, 'Writing');
  assert.deepEqual(state.projects[0].threads, ['chat-a']);
  assert.deepEqual(state.projectPins, ['writing']);
  assert.deepEqual(state.pinned, ['chat-a']);
  assert.deepEqual((await (await f.request('bob')).json()).projects[0].threads, []);
  assert.equal((await f.request('expired')).status, 401);
  assert.equal((await f.request('alice', create, { origin: 'http://evil.test' })).status, 403);
  assert.equal((await f.request('alice', { ...create, owner: 'bob' })).status, 400);
  assert.equal(
    (await f.request('alice', create, { authorization: '', cookie: 'altflow_studio_token=alice' })).status,
    403,
  );
  assert.equal(
    (
      await f.request('alice', create, {
        authorization: '',
        cookie: 'altflow_studio_token=alice',
        origin: 'http://studio.test',
      })
    ).status,
    200,
  );
});

test('concurrent edits do not overwrite each other and moving chats has one authoritative membership', async t => {
  const f = await setup(t);
  const responses = await Promise.all(['one', 'two'].map(id => f.request('alice', { type: 'create', id, name: id })));
  assert.deepEqual(
    responses.map(r => r.status),
    [200, 200],
  );
  assert.equal((await (await f.request('alice')).json()).projects.length, 2);
  await f.request('alice', {
    type: 'move',
    threadId: 'chat-a',
    projectId: 'one',
  });
  await f.request('alice', {
    type: 'move',
    threadId: 'chat-a',
    projectId: 'two',
  });
  const state = await (await f.request('alice')).json();
  assert.equal(state.projects.filter(p => p.threads.includes('chat-a')).length, 1);
  assert.deepEqual(state.projects.find(p => p.id === 'two').threads, ['chat-a']);
});

test('legacy import validates ownership, keeps server edits, and cannot resurrect a deleted project', async t => {
  const f = await setup(t);
  const legacy = {
    type: 'import',
    state: {
      projects: [{ id: 'old', name: 'Old', threads: ['chat-a', 'chat-b', 'missing'] }],
      projectPins: ['old'],
      pinned: ['chat-b', 'chat-a'],
      collapsed: [],
    },
  };
  assert.equal((await f.request('alice', legacy)).status, 200);
  const imported = await (await f.request('alice')).json();
  assert.deepEqual(imported.projects[0].threads, ['chat-a']);
  assert.deepEqual(imported.pinned, ['chat-a']);
  await f.request('alice', { type: 'rename', id: 'old', name: 'Current' });
  await f.request('alice', legacy);
  assert.equal((await (await f.request('alice')).json()).projects[0].name, 'Current');
  await f.request('alice', { type: 'remove', id: 'old' });
  assert.equal(await f.memory.getThreadById({ threadId: 'chat-a' }), null);
  assert.ok(await f.memory.getThreadById({ threadId: 'chat-b' }));
  await f.request('alice', legacy);
  legacy.state.projects[0].name = 'A different stale browser copy';
  await f.request('alice', legacy);
  assert.deepEqual((await (await f.request('alice')).json()).projects, []);
});

test('project deletion persists partial progress and retry deletes only the remaining chats', async t => {
  const f = await setup(t);
  await f.request('alice', { type: 'create', id: 'writing', name: 'Writing' });
  for (const threadId of ['chat-a', 'chat-c'])
    await f.request('alice', { type: 'move', threadId, projectId: 'writing' });
  const db = f.faultDatabase();
  t.after(() => db.close());
  await db.execute(
    "CREATE TRIGGER fail_project_delete BEFORE DELETE ON mastra_threads WHEN OLD.id = 'chat-c' BEGIN SELECT RAISE(FAIL, 'test storage unavailable'); END",
  );
  assert.equal((await f.request('alice', { type: 'remove', id: 'writing' })).status, 503);
  assert.deepEqual((await (await f.request('alice')).json()).projects[0].threads, ['chat-c']);
  assert.equal(await f.memory.getThreadById({ threadId: 'chat-a' }), null);
  await f.reopen();
  await db.execute('DROP TRIGGER fail_project_delete');
  assert.equal((await f.request('alice', { type: 'remove', id: 'writing' })).status, 200);
  assert.deepEqual((await (await f.request('alice')).json()).projects, []);
  assert.ok(await f.memory.getThreadById({ threadId: 'chat-b' }));
});
