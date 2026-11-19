import { createHash } from 'node:crypto';
import { createClient } from '@libsql/client';
import type { Client, Transaction } from '@libsql/client';
import type { MemoryStorage } from '@mastra/core/storage';
import { z } from 'zod';

const id = z.string().min(1).max(200);
const project = z
  .object({
    id,
    name: z.string().trim().min(1).max(100),
    agentId: id.optional(),
    threads: z.array(id).max(10000),
  })
  .strict();
export const organizationSchema = z
  .object({
    projects: z.array(project).max(500),
    projectPins: z.array(id).max(500).default([]),
    pinned: z.array(id).max(10000),
    collapsed: z.array(id).max(1000),
  })
  .strict();
export const projectCommandSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('create'),
      id,
      name: project.shape.name,
      agentId: id.optional(),
    })
    .strict(),
  z.object({ type: z.literal('rename'), id, name: project.shape.name }).strict(),
  z.object({ type: z.literal('remove'), id }).strict(),
  z.object({ type: z.literal('pinProject'), id, enabled: z.boolean() }).strict(),
  z.object({ type: z.literal('move'), threadId: id, projectId: id.optional() }).strict(),
  z.object({ type: z.literal('pin'), id, enabled: z.boolean() }).strict(),
  z.object({ type: z.literal('collapse'), id, enabled: z.boolean() }).strict(),
  z.object({ type: z.literal('forget'), threadId: id }).strict(),
  z.object({ type: z.literal('import'), state: organizationSchema }).strict(),
]);
export type ProjectCommand = z.infer<typeof projectCommandSchema>;
const persistedSchema = organizationSchema.extend({
  revision: z.number().int().nonnegative(),
  imports: z.array(z.string()),
  deletedProjects: z.array(z.string()).default([]),
});
const empty = () => ({
  projects: [],
  projectPins: [],
  pinned: [],
  collapsed: [],
  revision: 0,
  imports: [],
});
export class ProjectError extends Error {
  constructor(
    message: string,
    public status: 400 | 404 | 409 | 503 = 400,
  ) {
    super(message);
  }
}
function flag(values: string[], value: string, enabled: boolean) {
  return enabled ? [...new Set([value, ...values])] : values.filter(item => item !== value);
}

/** The authenticated account owns this document. Commands run against the latest state under a write lock. */
export class ConversationProjects {
  private db: Client;
  constructor(
    url: string,
    private memory: MemoryStorage,
  ) {
    this.db = createClient({ url });
  }
  async init() {
    // Dedicated application ledger, like user-files.db; never changes the account or Mastra schema.
    await this.db.execute(
      'CREATE TABLE IF NOT EXISTS conversation_organization (owner TEXT PRIMARY KEY, state TEXT NOT NULL)',
    );
    await this.db.execute('PRAGMA busy_timeout = 10000');
  }
  close() {
    this.db.close();
  }
  private async load(owner: string, connection: Client | Transaction = this.db) {
    const result = await connection.execute({
      sql: 'SELECT state FROM conversation_organization WHERE owner = ?',
      args: [owner],
    });
    return result.rows.length
      ? persistedSchema.parse(JSON.parse(String(result.rows[0].state)))
      : persistedSchema.parse(empty());
  }
  async read(owner: string) {
    const { imports: _, deletedProjects: _deleted, ...state } = await this.load(owner);
    return state;
  }
  private async owned(resourceId: string, threadId: string, missing = false) {
    const thread = await this.memory.getThreadById({ threadId });
    if (!thread) {
      if (missing) return false;
      throw new ProjectError('会话不存在', 404);
    }
    if (thread.resourceId !== resourceId) throw new ProjectError('会话不存在', 404);
    return true;
  }
  async command(owner: string, resourceId: string, command: ProjectCommand) {
    const tx = await this.db.transaction('write');
    try {
      const state = await this.load(owner, tx);
      const find = (id: string) => {
        const found = state.projects.find(project => project.id === id);
        if (!found) throw new ProjectError('项目不存在', 404);
        return found;
      };
      let partialDeletion = false;
      switch (command.type) {
        case 'create': {
          if (state.deletedProjects.includes(command.id)) throw new ProjectError('项目已删除', 409);
          const existing = state.projects.find(project => project.id === command.id);
          if (existing) {
            if (existing.name !== command.name || existing.agentId !== command.agentId)
              throw new ProjectError('项目标识已存在', 409);
            break;
          }
          state.projects.push({
            id: command.id,
            name: command.name,
            agentId: command.agentId,
            threads: [],
          });
          break;
        }
        case 'rename':
          find(command.id).name = command.name;
          break;
        case 'pinProject':
          find(command.id);
          state.projectPins = flag(state.projectPins, command.id, command.enabled);
          break;
        case 'collapse':
          state.collapsed = flag(state.collapsed, command.id, command.enabled);
          break;
        case 'pin':
          if (command.enabled) await this.owned(resourceId, command.id);
          state.pinned = flag(state.pinned, command.id, command.enabled);
          break;
        case 'move': {
          const target = command.projectId ? find(command.projectId) : undefined;
          await this.owned(resourceId, command.threadId);
          for (const project of state.projects) project.threads = project.threads.filter(id => id !== command.threadId);
          target?.threads.push(command.threadId);
          break;
        }
        case 'forget':
          // Metadata cleanup after an individually deleted chat; cannot erase another user's state.
          for (const project of state.projects) project.threads = project.threads.filter(id => id !== command.threadId);
          state.pinned = state.pinned.filter(id => id !== command.threadId);
          break;
        case 'remove': {
          const project = find(command.id);
          // Validate every existing member before the first destructive action.
          const present = new Set<string>();
          for (const threadId of project.threads)
            if (await this.owned(resourceId, threadId, true)) present.add(threadId);
          const remaining: string[] = [];
          for (const threadId of project.threads) {
            try {
              if (present.has(threadId)) await this.memory.deleteThread({ threadId });
              state.pinned = state.pinned.filter(id => id !== threadId);
            } catch {
              remaining.push(threadId);
            }
          }
          project.threads = remaining;
          partialDeletion = remaining.length > 0;
          if (!partialDeletion) {
            state.deletedProjects.push(command.id);
            state.projects = state.projects.filter(project => project.id !== command.id);
            state.projectPins = state.projectPins.filter(id => id !== command.id);
            state.collapsed = state.collapsed.filter(id => id !== command.id);
          }
          break;
        }
        case 'import': {
          const hash = createHash('sha256').update(JSON.stringify(command.state)).digest('hex');
          if (state.imports.includes(hash)) break;
          const assigned = new Set(state.projects.flatMap(project => project.threads));
          for (const project of command.state.projects) {
            // Server records win over stale copies from another browser.
            if (state.deletedProjects.includes(project.id) || state.projects.some(current => current.id === project.id))
              continue;
            const threads: string[] = [];
            for (const threadId of new Set(project.threads)) {
              const thread = await this.memory.getThreadById({ threadId });
              if (thread?.resourceId === resourceId && !assigned.has(threadId)) {
                threads.push(threadId);
                assigned.add(threadId);
              }
            }
            state.projects.push({ ...project, threads });
          }
          for (const threadId of command.state.pinned) {
            const thread = await this.memory.getThreadById({ threadId });
            if (thread?.resourceId === resourceId) state.pinned = flag(state.pinned, threadId, true);
          }
          state.projectPins = [
            ...new Set([
              ...state.projectPins,
              ...command.state.projectPins.filter(id => state.projects.some(p => p.id === id)),
            ]),
          ];
          state.collapsed = [...new Set([...state.collapsed, ...command.state.collapsed])];
          state.imports.push(hash);
          break;
        }
      }
      organizationSchema.parse({
        projects: state.projects,
        pinned: state.pinned,
        projectPins: state.projectPins,
        collapsed: state.collapsed,
      });
      state.revision++;
      await tx.execute({
        sql: 'INSERT INTO conversation_organization(owner, state) VALUES (?, ?) ON CONFLICT(owner) DO UPDATE SET state = excluded.state',
        args: [owner, JSON.stringify(state)],
      });
      await tx.commit();
      if (partialDeletion) throw new ProjectError('部分聊天删除失败，请重试删除剩余聊天', 503);
      const { imports: _, deletedProjects: _deleted, ...publicState } = state;
      return publicState;
    } catch (error) {
      if (!tx.closed) await tx.rollback();
      throw error;
    } finally {
      tx.close();
    }
  }
}
