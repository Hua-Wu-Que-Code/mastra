import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@libsql/client';
import { LibSQLStore } from '@mastra/libsql';
import { afterEach, describe, expect, it } from 'vitest';
import { LibSQLSessionSearch } from '../session-search/service';

const cleanups: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup();
});

describe('LibSQL conversation search', () => {
  it('searches persisted historical message text and isolates accounts across reopening', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'altflow-search-')),
      url = `file:${join(dir, 'test.db')}`;
    const store = new LibSQLStore({ id: 'search-test', url });
    await store.init();
    const memory = await store.getStore('memory');
    if (!memory) throw new Error('Memory missing');
    const createdAt = new Date('2020-01-01T00:00:00Z');
    for (const [id, resourceId] of [
      ['old', 'alice'],
      ['new', 'alice'],
      ['private', 'bob'],
    ]) {
      await memory.saveThread({
        thread: { id: id!, resourceId: resourceId!, title: 'A conversation', createdAt, updatedAt: createdAt },
      });
    }
    await memory.saveMessages({
      messages: [
        {
          id: 'old-hit',
          threadId: 'old',
          resourceId: 'alice',
          role: 'user',
          createdAt,
          content: { format: 2, parts: [{ type: 'text', text: '设定：海上孤城' }] },
        },
        {
          id: 'new-hit',
          threadId: 'new',
          resourceId: 'alice',
          role: 'assistant',
          createdAt: new Date('2021-01-01'),
          content: {
            format: 2,
            parts: [
              { type: 'text', text: '海上孤城的主角' },
              { type: 'reasoning', text: 'secret reasoning' },
            ],
          },
        },
        {
          id: 'private-hit',
          threadId: 'private',
          resourceId: 'bob',
          role: 'user',
          createdAt,
          content: { format: 2, parts: [{ type: 'text', text: '海上孤城 private' }] },
        },
        ...(['user', 'notification'] as const).map(type => ({
          id: `signal-${type}`,
          threadId: 'old',
          resourceId: 'alice',
          role: 'signal' as const,
          createdAt,
          content: {
            format: 2 as const,
            parts: [{ type: 'text' as const, text: `signal-${type}-text` }],
            metadata: { signal: { type } },
          },
        })),
        {
          id: 'tool',
          threadId: 'old',
          resourceId: 'alice',
          role: 'tool',
          createdAt,
          content: { format: 2, parts: [{ type: 'text', text: 'secret tool result' }] },
        },
      ],
    });
    await store.close();
    const client = createClient({ url });
    cleanups.push(async () => {
      client.close();
      await rm(dir, { recursive: true, force: true });
    });
    const search = new LibSQLSessionSearch(client);
    const result = await search.search({ resourceId: 'alice', query: '海上孤城', limit: 1 });
    expect(result.truncated).toBe(true);
    expect(result.results.map(r => r.messageId)).toEqual(['new-hit']);
    expect(
      (await search.search({ resourceId: 'alice', query: '海上孤城', limit: 20 })).results.map(r => r.threadId),
    ).toEqual(['new', 'old']);
    expect(
      (await search.search({ resourceId: 'bob', query: '海上孤城', limit: 20 })).results.map(r => r.threadId),
    ).toEqual(['private']);
    expect(
      (await search.search({ resourceId: 'alice', query: 'signal-user-text', limit: 20 })).results.map(
        row => row.messageId,
      ),
    ).toEqual(['signal-user']);
    expect(
      (await search.search({ resourceId: 'alice', query: 'signal-notification-text', limit: 20 })).results,
    ).toEqual([]);
    for (const query of ['secret reasoning', 'secret tool result', "' OR 1=1 --", '%']) {
      expect((await search.search({ resourceId: 'alice', query, limit: 20 })).results).toEqual([]);
    }
  });
});
