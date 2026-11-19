import { createClient } from '@libsql/client';
import { z } from 'zod';

const childSchema = z.object({
  id: z.string(),
  name: z.string(),
  parent: z.string(),
  description: z.string(),
  prompt: z.string(),
  state: z.enum(['preparing', 'queued', 'running', 'completed', 'failed', 'interrupted']),
  generation: z.number(),
  lease: z.number(),
  result: z.string().optional(),
  error: z.string().optional(),
  model: z.string().optional(),
  reasoningLevel: z.string().optional(),
  forked: z.boolean(),
  startedAt: z.number().optional(),
  finishedAt: z.number().optional(),
  elapsedMs: z.number().optional(),
  totalTokens: z.number().optional(),
});
const mailSchema = z.object({
  id: z.string(),
  sender: z.string(),
  target: z.string(),
  contents: z.string(),
  type: z.enum(['message', 'completion']),
  delivered: z.boolean(),
  createdAt: z.string(),
});
export const taskSchema = z.object({
  id: z.string(),
  subject: z.string(),
  description: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed']),
  owner: z.string().optional(),
  revision: z.number().int(),
  blockedBy: z.array(z.string()),
  writeScopes: z.array(z.string()),
});
const treeSchema = z.object({
  children: z.array(childSchema),
  mail: z.array(mailSchema),
  tasks: z.array(taskSchema),
});
export type Child = z.infer<typeof childSchema>;
export type Mail = z.infer<typeof mailSchema>;
export type TeamTask = z.infer<typeof taskSchema>;
export type Tree = z.infer<typeof treeSchema>;
const empty = (): Tree => ({ children: [], mail: [], tasks: [] });

/** One account/tree transaction owns admission, names, inbox and task revisions. Never browser state. */
export class SubagentStore {
  private db;
  private writeTail: Promise<void> = Promise.resolve();
  constructor(url: string) {
    this.db = createClient({ url });
  }
  async init() {
    await this.db.execute(
      'CREATE TABLE IF NOT EXISTS altflow_subagent_trees (owner TEXT NOT NULL, root TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY(owner, root))',
    );
    await this.db.execute('PRAGMA busy_timeout=10000');
  }
  close() {
    this.db.close();
  }
  async read(owner: string, root: string): Promise<Tree> {
    const result = await this.db.execute({
      sql: 'SELECT value FROM altflow_subagent_trees WHERE owner=? AND root=?',
      args: [owner, root],
    });
    return result.rows[0] ? treeSchema.parse(JSON.parse(String(result.rows[0].value))) : empty();
  }
  async edit<T>(owner: string, root: string, edit: (tree: Tree) => T | Promise<T>): Promise<T> {
    const previous = this.writeTail;
    let release = () => {};
    this.writeTail = new Promise<void>(resolve => {
      release = resolve;
    });
    await previous;
    try {
      return await this.transaction(owner, root, edit);
    } finally {
      release();
    }
  }
  private async transaction<T>(owner: string, root: string, edit: (tree: Tree) => T | Promise<T>): Promise<T> {
    const tx = await this.db.transaction('write');
    try {
      const row = await tx.execute({
        sql: 'SELECT value FROM altflow_subagent_trees WHERE owner=? AND root=?',
        args: [owner, root],
      });
      const tree = row.rows[0] ? treeSchema.parse(JSON.parse(String(row.rows[0].value))) : empty();
      const result = await edit(tree);
      await tx.execute({
        sql: 'INSERT INTO altflow_subagent_trees(owner,root,value) VALUES(?,?,?) ON CONFLICT(owner,root) DO UPDATE SET value=excluded.value',
        args: [owner, root, JSON.stringify(treeSchema.parse(tree))],
      });
      await tx.commit();
      return result;
    } catch (error) {
      if (!tx.closed) await tx.rollback();
      throw error;
    } finally {
      tx.close();
    }
  }
}
