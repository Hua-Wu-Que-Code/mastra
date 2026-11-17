import './environment.mjs';
import { createClient } from '@libsql/client';
import OSS from 'ali-oss';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { UserStorage } from '../src/mastra/user-storage.ts';
import { restoreLegacyAttachments } from '../src/mastra/legacy-files.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const db = createClient({ url: `file:${resolve(root, 'src/mastra/public/preview.db')}` });
const store = new UserStorage({
  client: new OSS({
    accessKeyId: process.env.ALTFLOW_OSS_ACCESS_KEY_ID,
    accessKeySecret: process.env.ALTFLOW_OSS_ACCESS_KEY_SECRET,
    bucket: process.env.ALTFLOW_OSS_BUCKET ?? 'altflow-harness',
    region: process.env.ALTFLOW_OSS_REGION ?? 'oss-cn-beijing',
    endpoint: process.env.ALTFLOW_OSS_ENDPOINT ?? 'https://oss-cn-beijing.aliyuncs.com',
    authorizationV4: true,
    timeout: 30000,
  }),
  databaseUrl: process.env.ALTFLOW_FILES_DATABASE_URL ?? `file:${resolve(root, 'data/user-files.db')}`,
  authToken: process.env.ALTFLOW_FILES_DATABASE_AUTH_TOKEN,
});
try {
  await store.init();
  const rows = (
    await db.execute(`SELECT m.id,m.role,m.content,t.resourceId AS owner
    FROM mastra_messages m JOIN mastra_threads t ON t.id=m.thread_id
    WHERE m.role IN ('user','signal')`)
  ).rows;
  let restored = 0;
  for (const row of rows) {
    // Resource IDs come from the authenticated conversation ledger, never attachment text.
    const owner = row.owner.startsWith('altflow:')
      ? row.owner.slice(8)
      : row.owner === 'creator-agent'
        ? process.env.ALTFLOW_LEGACY_OWNER_ID
        : undefined;
    if (!owner) continue;
    const content = JSON.parse(row.content);
    if (row.role === 'signal' && content.metadata?.signal?.type !== 'user') continue;
    restored += await restoreLegacyAttachments(store, owner, row.id, content.parts ?? []);
  }
  console.log(JSON.stringify({ restoredAttachments: restored }));
} catch (error) {
  // OSS exceptions can contain signed request headers.
  console.error(
    JSON.stringify({
      error: 'Legacy file import failed',
      status: error?.status ?? null,
      code: error?.code ?? null,
    }),
  );
  process.exitCode = 1;
} finally {
  db.close();
  store.close();
}
