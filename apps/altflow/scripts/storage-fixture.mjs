import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import OSS from 'ali-oss';
import { UserStorage } from '../src/mastra/user-storage.ts';

export async function setup(t, quota = 512 * 1024 * 1024) {
  const objects = new Map();
  let failWrites = false,
    failDeletes = false;
  const server = createServer(async (req, res) => {
    const key = req.url;
    if (req.method === 'PUT') {
      if (failWrites) {
        res.writeHead(403);
        res.end('<Error><Code>AccessDenied</Code></Error>');
        return;
      }
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      objects.set(key, Buffer.concat(chunks));
      res.setHeader('etag', '"test-etag"');
      res.end();
    } else if (req.method === 'DELETE') {
      if (failDeletes) {
        res.writeHead(403);
        res.end('<Error><Code>AccessDenied</Code></Error>');
        return;
      }
      objects.delete(key);
      res.writeHead(204);
      res.end();
    } else if (objects.has(key)) res.end(objects.get(key));
    else {
      res.writeHead(404);
      res.end('<Error><Code>NoSuchKey</Code></Error>');
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const dir = await mkdtemp(join(tmpdir(), 'user-storage-'));
  const client = new OSS({
    accessKeyId: 'test-id',
    accessKeySecret: 'test-secret',
    bucket: 'test',
    region: 'oss-cn-beijing',
    endpoint: `http://127.0.0.1:${server.address().port}`,
    cname: true,
    authorizationV4: true,
  });
  let store = new UserStorage({ client, databaseUrl: `file:${join(dir, 'files.db')}`, quota });
  await store.init();
  t.after(async () => {
    store.close();
    await new Promise(resolve => server.close(resolve));
    await rm(dir, { recursive: true, force: true });
  });
  return {
    get store() {
      return store;
    },
    objects,
    failWrites: () => {
      failWrites = true;
    },
    failDeletes: value => {
      failDeletes = value;
    },
    async reopen() {
      store.close();
      store = new UserStorage({ client, databaseUrl: `file:${join(dir, 'files.db')}`, quota });
      await store.init();
      return store;
    },
  };
}
