import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { Hono } from 'hono';
import { LibSQLStore } from '@mastra/libsql';
import { createAltFlowAuth } from '../src/mastra/altflow-auth.ts';

async function setup(t) {
  const dir = await mkdtemp(join(tmpdir(), 'account-preferences-'));
  const memoryStore = new LibSQLStore({ id: 'preferences-test', url: `file:${join(dir, 'memory.db')}` });
  await memoryStore.init();
  const memory = await memoryStore.getStore('memory');
  await memory.saveThread({ thread: { id: 'chat-alice', resourceId: 'altflow:alice', title: 'Alice', createdAt: new Date(), updatedAt: new Date() } });
  const auth = createServer((req, res) => {
    const owner = req.headers.authorization?.match(/^Bearer (alice|bob)$/)?.[1];
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(owner ? { code: 0, message: '', data: { userId: owner, username: owner, role: 'creator' } } : { code: 40100, message: 'expired', data: null }));
  });
  await new Promise(resolve => auth.listen(0, '127.0.0.1', resolve));
  const accounts = createAltFlowAuth({ backendUrl: `http://127.0.0.1:${auth.address().port}`, origins: ['http://studio.test'], secureCookies: false });
  const module = await import('../src/mastra/services/account-preferences.ts');
  let store;
  let app;
  const reopen = async () => {
    store?.close();
    app = new Hono();
    store = new module.AccountPreferences(`file:${join(dir, 'preferences.db')}`, memory);
    await store.init();
    const { accountPreferenceRoutes } = await import('../src/mastra/routes/account-preferences.ts');
    for (const route of accountPreferenceRoutes(store, accounts, ['http://studio.test'])) app.on(route.method, route.path, route.handler);
  };
  await reopen();
  t.after(async () => { store?.close(); await memoryStore.close(); await new Promise(resolve => auth.close(resolve)); await rm(dir, { recursive: true, force: true }); });
  const request = (owner, kind, id, patch, extra = {}) => app.request(`/account-preferences?${new URLSearchParams({ kind, id })}`, {
    method: patch === undefined ? 'GET' : 'POST', headers: { authorization: `Bearer ${owner}`, 'Content-Type': 'application/json', ...extra },
    body: patch === undefined ? undefined : JSON.stringify({ kind, id, ...patch }),
  });
  return { request, reopen };
}

test('account preferences survive a fresh session and restart without leaking to another account', async t => {
  const f = await setup(t);
  assert.equal((await f.request('alice', 'memory', 'creator-agent', { patch: { enabled: false } })).status, 200);
  assert.equal((await f.request('alice', 'chat', 'global', { patch: { fontSize: 18, busyEnter: 'steer' } })).status, 200);
  await f.reopen();
  assert.deepEqual((await (await f.request('alice', 'memory', 'creator-agent')).json()).value, { enabled: false });
  assert.equal((await (await f.request('alice', 'chat', 'global')).json()).value.fontSize, 18);
  assert.deepEqual((await (await f.request('bob', 'memory', 'creator-agent')).json()).value, {});
  assert.equal((await f.request('expired', 'chat', 'global')).status, 401);
  assert.equal((await f.request('alice', 'chat', 'global', { patch: { fontSize: 18 }, owner: 'bob' })).status, 400);
  assert.equal((await f.request('alice', 'chat', 'global', { patch: { fontSize: 99 } })).status, 400);
  assert.equal((await f.request('alice', 'chat', 'global', { patch: {} }, { authorization: '', cookie: 'altflow_studio_token=alice' })).status, 403);
  assert.equal((await f.request('alice', 'chat', 'global', { patch: {} }, { origin: 'http://evil.test' })).status, 403);
});

test('thread model settings merge concurrent fields, reset durably, and import only owned history once', async t => {
  const f = await setup(t);
  const id = JSON.stringify(['creator-agent', 'chat-alice']);
  assert.equal((await f.request('alice', 'thread', id, { patch: { selection: { provider: 'altflow', model: 'qwen' } }, import: true })).status, 200);
  const writes = await Promise.all([
    f.request('alice', 'thread', id, { patch: { modelSettings: { temperature: 0.3 } } }),
    f.request('alice', 'thread', id, { patch: { modelSettings: { maxTokens: 1200 } } }),
  ]);
  assert.deepEqual(writes.map(r => r.status), [200, 200]);
  let saved = await (await f.request('alice', 'thread', id)).json();
  assert.deepEqual(saved.value.modelSettings, { temperature: 0.3, maxTokens: 1200 });
  await f.request('alice', 'thread', id, { patch: { selection: null, modelSettings: null } });
  await f.request('alice', 'thread', id, { patch: { selection: { provider: 'old', model: 'old' } }, import: true });
  await f.reopen();
  assert.deepEqual((await (await f.request('alice', 'thread', id)).json()).value, {});
  assert.equal((await f.request('bob', 'thread', id, { patch: {}, import: true })).status, 404);
  assert.equal((await f.request('bob', 'thread', id)).status, 404);
  assert.equal((await f.request('alice', 'thread', JSON.stringify(['creator-agent', 'missing']), { patch: {}, import: true })).status, 404);
});
