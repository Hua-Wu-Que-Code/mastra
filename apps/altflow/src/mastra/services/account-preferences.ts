import { createClient } from '@libsql/client';
import type { Client } from '@libsql/client';
import type { MemoryStorage } from '@mastra/core/storage';
import { z } from 'zod';

const identifier = z.string().min(1).max(500);
export const preferenceAddress = z
  .object({ kind: z.enum(['chat', 'memory', 'thread', 'agent']), id: identifier })
  .strict();
export const preferenceCommand = preferenceAddress
  .extend({ patch: z.record(z.string(), z.json()), import: z.boolean().optional() })
  .strict();
const selection = z.object({ provider: z.string().max(200), model: z.string().max(200) }).strict();
const modelSettings = z
  .object({
    frequencyPenalty: z.number(),
    presencePenalty: z.number(),
    maxRetries: z.number().int().nonnegative(),
    maxSteps: z.number().int().positive(),
    maxTokens: z.number().int().positive(),
    temperature: z.number(),
    topK: z.number(),
    topP: z.number(),
    seed: z.number(),
    providerOptions: z.record(z.string(), z.record(z.string(), z.json())),
    chatWithGenerateLegacy: z.boolean(),
    chatWithGenerate: z.boolean(),
    chatWithLegacyStream: z.boolean(),
    chatWithNetwork: z.boolean(),
    teamwork: z.boolean(),
    requireToolApproval: z.boolean(),
  })
  .partial()
  .strict();
const schemas = {
  memory: z.object({ enabled: z.boolean().optional() }).strict(),
  chat: z
    .object({
      plainText: z.boolean(),
      showContextUsage: z.boolean(),
      sendShortcut: z.enum(['enter', 'mod-enter']),
      busyEnter: z.enum(['queue', 'steer']),
      fontSize: z.number().int().min(10).max(22),
      workDetails: z.enum(['compact', 'standard', 'detailed', 'verbose']),
      collapseTiming: z.enum(['completion', 'next-input']),
      foldedReplies: z.enum(['all', 'final']),
    })
    .partial()
    .strict(),
  thread: z.object({ selection: selection.optional(), modelSettings: modelSettings.optional() }).strict(),
  agent: z.object({ modelSettings: modelSettings.optional() }).strict(),
};
const object = z.record(z.string(), z.json());
function merge(current: Record<string, unknown>, patch: Record<string, unknown>): Record<string, unknown> {
  const result = { ...current };
  for (const [key, value] of Object.entries(patch)) {
    if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new PreferenceError('设置字段无效');
    if (value === null) delete result[key];
    else if (typeof value === 'object' && !Array.isArray(value))
      result[key] = merge(object.parse(result[key] ?? {}), object.parse(value));
    else result[key] = value;
  }
  return result;
}
export class PreferenceError extends Error {
  constructor(
    message: string,
    public status: 400 | 404 | 503 = 400,
  ) {
    super(message);
  }
}
/** Account identity comes only from Go authentication. Each write merges under a database write lock. */
export interface PreferenceEntry {
  value: Record<string, unknown>;
  revision: number;
}
export class AccountPreferences {
  private db: Client;
  constructor(
    url: string,
    private memory: MemoryStorage,
  ) {
    this.db = createClient({ url });
  }
  async init() {
    await this.db.execute(
      'CREATE TABLE IF NOT EXISTS account_preferences (owner TEXT NOT NULL, kind TEXT NOT NULL, id TEXT NOT NULL, value TEXT NOT NULL, revision INTEGER NOT NULL, PRIMARY KEY(owner, kind, id))',
    );
    await this.db.execute('PRAGMA busy_timeout = 10000');
  }
  close() {
    this.db.close();
  }
  private async authorize(resourceId: string, address: z.infer<typeof preferenceAddress>, importing = false) {
    if (address.kind === 'chat' && address.id !== 'global') throw new PreferenceError('设置标识无效');
    if (address.kind !== 'thread') return;
    const [, threadId] = z.tuple([identifier, identifier]).parse(JSON.parse(address.id));
    const thread = await this.memory.getThreadById({ threadId });
    if ((thread && thread.resourceId !== resourceId) || (!thread && importing))
      throw new PreferenceError('会话不存在', 404);
  }
  async read(owner: string, resourceId: string, address: z.infer<typeof preferenceAddress>): Promise<PreferenceEntry> {
    await this.authorize(resourceId, address);
    const result = await this.db.execute({
      sql: 'SELECT value, revision FROM account_preferences WHERE owner = ? AND kind = ? AND id = ?',
      args: [owner, address.kind, address.id],
    });
    const row = result.rows[0];
    return {
      value: row ? schemas[address.kind].parse(JSON.parse(String(row.value))) : {},
      revision: row ? Number(row.revision) : 0,
    };
  }
  async write(owner: string, resourceId: string, command: z.infer<typeof preferenceCommand>): Promise<PreferenceEntry> {
    await this.authorize(resourceId, command, command.import);
    const tx = await this.db.transaction('write');
    try {
      const result = await tx.execute({
        sql: 'SELECT value, revision FROM account_preferences WHERE owner = ? AND kind = ? AND id = ?',
        args: [owner, command.kind, command.id],
      });
      const row = result.rows[0];
      const current = row ? object.parse(JSON.parse(String(row.value))) : {};
      // Even an explicitly reset empty entry wins over a stale browser backup.
      if (command.import && row) {
        await tx.commit();
        return { value: current, revision: Number(row.revision) };
      }
      const value = schemas[command.kind].parse(merge(current, command.patch));
      if (Buffer.byteLength(JSON.stringify(value)) > 65536) throw new PreferenceError('设置数据过大');
      const revision = (row ? Number(row.revision) : 0) + 1;
      await tx.execute({
        sql: 'INSERT INTO account_preferences(owner, kind, id, value, revision) VALUES (?, ?, ?, ?, ?) ON CONFLICT(owner, kind, id) DO UPDATE SET value = excluded.value, revision = excluded.revision',
        args: [owner, command.kind, command.id, JSON.stringify(value), revision],
      });
      await tx.commit();
      return { value, revision };
    } catch (error) {
      if (!tx.closed) await tx.rollback();
      throw error;
    } finally {
      tx.close();
    }
  }
}
