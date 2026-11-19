import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { UserFilesystem } from '../src/mastra/user-filesystem.ts';
import { setup } from './storage-fixture.mjs';

test('an uploaded document survives reopening and is readable through the agent filesystem, isolated per user', async t => {
  const fixture = await setup(t);
  await fixture.store.write('alice', '/uploads/book.txt', Buffer.from('小说正文'), {
    mimeType: 'text/plain',
    source: 'upload',
  });
  const store = await fixture.reopen();
  const a = new UserFilesystem(store, 'alice');
  const b = new UserFilesystem(store, 'bob');
  assert.equal(await a.readFile('/uploads/book.txt', { encoding: 'utf8' }), '小说正文');
  assert.equal(await b.exists('/uploads/book.txt'), false);
  await assert.rejects(b.readFile('/uploads/book.txt'), /不存在/);
  await a.writeFile('/drafts/大纲.md', '# 大纲');
  assert.deepEqual((await store.list('alice')).map(f => f.source).sort(), ['generated', 'upload']);
  assert.equal((await store.summary('alice')).usedBytes, Buffer.byteLength('小说正文# 大纲'));
});

test('concurrent uploads cannot overrun quota and failed OSS writes release their reservations', async t => {
  const { store, failWrites } = await setup(t, 10);
  const results = await Promise.allSettled([
    store.write('alice', '/a.txt', Buffer.alloc(7)),
    store.write('alice', '/b.txt', Buffer.alloc(7)),
  ]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal((await store.summary('alice')).usedBytes, 7);
  const file = (await store.list('alice'))[0];
  await store.write('alice', file.path, Buffer.alloc(9));
  assert.equal((await store.summary('alice')).usedBytes, 9);
  await store.remove('alice', file.path);
  assert.equal((await store.summary('alice')).usedBytes, 0);
  failWrites();
  await assert.rejects(store.write('alice', '/failed.txt', Buffer.alloc(8)));
  assert.equal((await store.summary('alice')).reservedBytes, 0);
});

test('independent uploads below quota both succeed', async t => {
  const { store } = await setup(t, 100);
  await Promise.all([
    store.write('alice', '/one.txt', Buffer.alloc(3)),
    store.write('alice', '/two.txt', Buffer.alloc(4)),
  ]);
  assert.equal((await store.summary('alice')).usedBytes, 7);
});

test('empty nested directories count as existing nonempty parents and remain isolated', async t => {
  const { store } = await setup(t);
  const fs = new UserFilesystem(store, 'alice');
  await fs.mkdir('/drafts/chapters');
  assert.equal(await fs.exists('/drafts'), true);
  assert.equal(await new UserFilesystem(store, 'bob').exists('/drafts'), false);
  await assert.rejects(fs.rmdir('/drafts'), /目录不为空/);
  assert.equal(await fs.exists('/drafts/chapters'), true);
  await fs.rmdir('/drafts', { recursive: true });
  assert.equal(await fs.exists('/drafts'), false);
});

test('agent copy, move, append and recursive delete share quota and reject escaping paths', async t => {
  const { store } = await setup(t, 20);
  const fs = new UserFilesystem(store, 'alice');
  await fs.writeFile('/drafts/a.txt', '12345');
  await fs.copyFile('/drafts/a.txt', '/drafts/b.txt');
  await fs.appendFile('/drafts/b.txt', '67890');
  await fs.moveFile('/drafts/a.txt', '/final.txt');
  assert.equal((await store.summary('alice')).usedBytes, 15);
  await assert.rejects(fs.writeFile('../bob/secret.txt', 'bad'), /路径/);
  await assert.rejects(fs.appendFile('/drafts/b.txt', '123456'), /512|空间/);
  await fs.rmdir('/drafts', { recursive: true });
  assert.equal((await store.summary('alice')).usedBytes, 5);
});

test('failed deletes retain the file and quota; overwritten blobs are retried after reopening', async t => {
  const fixture = await setup(t, 100);
  const { store, objects, failDeletes } = fixture;
  await store.write('alice', '/a.txt', Buffer.from('original'));
  failDeletes(true);
  await assert.rejects(store.remove('alice', '/a.txt'));
  assert.equal((await store.summary('alice')).usedBytes, 8);
  assert.equal((await store.list('alice')).length, 1);
  await store.write('alice', '/a.txt', Buffer.from('updated'));
  assert.equal(objects.size, 2);
  failDeletes(false);
  const reopened = await fixture.reopen();
  assert.equal(objects.size, 1);
  assert.equal((await reopened.read('alice', '/a.txt')).toString(), 'updated');
  await reopened.remove('alice', '/a.txt');
  assert.equal(objects.size, 0);
  assert.equal((await reopened.summary('alice')).usedBytes, 0);
});

test('storage HTTP routes enforce Go-backed identity, origin, ownership and actual streamed quota', async t => {
  const { Hono } = await import('hono');
  const { createAltFlowAuth } = await import('../src/mastra/altflow-auth.ts');
  const { userStorageRoutes } = await import('../src/mastra/user-storage-routes.ts');
  // Only the external authentication and OSS HTTP boundaries are fixtures.
  const authServer = createServer((req, res) => {
    const id =
      req.headers.authorization === 'Bearer alice'
        ? 'alice'
        : req.headers.authorization === 'Bearer bob'
          ? 'bob'
          : undefined;
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(id ? 200 : 401);
    res.end(
      JSON.stringify(
        id
          ? { code: 0, message: '', data: { userId: id, username: id, role: 'creator' } }
          : { code: 40100, message: 'expired', data: null },
      ),
    );
  });
  await new Promise(resolve => authServer.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => authServer.close(resolve)));
  const accounts = createAltFlowAuth({
    backendUrl: `http://127.0.0.1:${authServer.address().port}`,
    origins: ['http://studio.test'],
    secureCookies: false,
  });
  const { store } = await setup(t, 10);
  const app = new Hono();
  for (const route of userStorageRoutes(store, accounts.authenticate, ['http://studio.test']))
    app.on(route.method, route.path, route.handler);
  assert.equal((await app.request('/storage')).status, 401);
  assert.equal((await app.request('/storage', { headers: { authorization: 'Bearer expired' } })).status, 401);
  const upload = (headers, body = 'hello') =>
    app.request('/storage/upload?id=test1&name=book.txt', { method: 'POST', headers, body });
  assert.equal((await upload({ cookie: 'altflow_studio_token=alice' })).status, 403);
  assert.equal((await upload({ cookie: 'altflow_studio_token=alice', origin: 'http://evil.test' })).status, 403);
  assert.equal((await upload({ cookie: 'altflow_studio_token=alice', origin: 'http://studio.test' })).status, 201);
  assert.equal((await upload({ authorization: 'Bearer alice' })).status, 201); // stable upload id is idempotent
  assert.equal((await store.summary('alice')).usedBytes, 5);
  const bob = { authorization: 'Bearer bob' };
  const alice = { authorization: 'Bearer alice' };
  assert.equal((await (await app.request('/storage', { headers: bob })).json()).files.length, 0);
  const path = encodeURIComponent('/uploads/test1/book.txt');
  assert.equal((await app.request(`/storage/download?path=${path}`, { headers: bob })).status, 404);
  assert.equal((await app.request(`/storage/file?path=${path}`, { method: 'DELETE', headers: bob })).status, 404);
  const downloaded = await app.request(`/storage/download?path=${path}`, { headers: alice });
  assert.equal(await downloaded.text(), 'hello');
  assert.match(downloaded.headers.get('content-disposition'), /attachment/);
  assert.equal(downloaded.headers.get('cache-control'), 'no-store');
  assert.equal(
    (
      await app.request('/storage/upload?id=test2&name=large.txt', {
        method: 'POST',
        headers: alice,
        body: '123456',
      })
    ).status,
    413,
  );
  assert.equal((await store.summary('alice')).usedBytes, 5);
  assert.equal((await app.request(`/storage/file?path=${path}`, { method: 'DELETE', headers: alice })).status, 200);
  assert.equal((await store.summary('alice')).usedBytes, 0);
});

test('legacy attachment recovery preserves text, is idempotent and never imports workspace references', async t => {
  const { restoreLegacyAttachments } = await import('../src/mastra/legacy-files.ts');
  const { store } = await setup(t);
  const parts = [
    { type: 'text', text: '<attachment name="小说.txt">原始正文\n</attachment>' },
    {
      type: 'text',
      text: '<attachment name="new.txt">文件已保存到当前用户工作区：/uploads/a/new.txt</attachment>',
    },
  ];
  assert.equal(await restoreLegacyAttachments(store, 'alice', 'old-message', parts), 1);
  assert.equal(await restoreLegacyAttachments(store, 'alice', 'old-message', parts), 1);
  assert.equal((await store.list('alice')).length, 1);
  assert.equal((await store.read('alice', '/uploads/legacy-old-message-0/小说.txt')).toString(), '原始正文\n');
  assert.equal((await store.list('bob')).length, 0);
});

test('file delivery references the private ledger without duplicating quota and rejects missing or foreign files', async t => {
  const { UserDeliveryService } = await import('../src/mastra/services/delivery.ts');
  const { createPresentTool } = await import('@mastra/altflow-tools');
  const { RequestContext, MASTRA_RESOURCE_ID_KEY, MASTRA_NORMALIZED_USER_KEY } =
    await import('@mastra/core/request-context');
  const fixture = await setup(t);
  await fixture.store.write('alice', '/report.md', Buffer.from('# Final report'), { mimeType: 'text/markdown' });
  const delivery = new UserDeliveryService(fixture.store);
  const tool = createPresentTool({ service: delivery });
  const context = user => {
    const requestContext = new RequestContext();
    requestContext.setRaw(MASTRA_NORMALIZED_USER_KEY, { id: user });
    requestContext.set(MASTRA_RESOURCE_ID_KEY, `altflow:${user}`);
    return { requestContext, agent: { agentId: 'creator-agent' } };
  };
  const before = await fixture.store.summary('alice');
  const output = await tool.execute(
    { files: [{ path: '/report.md', description: 'Final report' }, { path: '/report.md' }] },
    context('alice'),
  );
  assert.equal(output.files.length, 1);
  assert.equal(output.files[0].downloadUrl, '/storage/download?path=%2Freport.md');
  assert.equal((await fixture.store.summary('alice')).usedBytes, before.usedBytes);
  await assert.rejects(tool.execute({ files: [{ path: '/report.md' }] }, context('bob')), /不存在/);
  await assert.rejects(tool.execute({ files: [{ path: '/report.md' }] }, {}), { code: 'AUTHENTICATION_REQUIRED' });
  await fixture.store.remove('alice', '/report.md');
  await assert.rejects(delivery.present({ userId: 'alice' }, [{ path: '/report.md' }]), /不存在/);
});
