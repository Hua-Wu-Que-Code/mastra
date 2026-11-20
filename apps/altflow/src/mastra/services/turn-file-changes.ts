import { AsyncLocalStorage } from 'node:async_hooks';
import { posix } from 'node:path';
import type { Transaction } from '@libsql/client';
import type { ProcessInputStepArgs } from '@mastra/core/processors';
import { MASTRA_NORMALIZED_USER_KEY } from '@mastra/core/request-context';
import { z } from 'zod';

type Scope = { owner: string; thread: string; turn: string };
export type FileVersion = { digest: string; text: string | null };
export const trackTurnFiles = new AsyncLocalStorage<Scope>();
export const snapshotLimit = 64 * 1024;

export const turnChangesSchema = `
  CREATE TABLE IF NOT EXISTS turn_file_changes (
    owner TEXT NOT NULL, thread TEXT NOT NULL, turn TEXT NOT NULL, path TEXT NOT NULL,
    before_digest TEXT, after_digest TEXT, before_text TEXT, after_text TEXT,
    updated INTEGER NOT NULL, PRIMARY KEY(owner, thread, turn, path));
`;

export function textSnapshot(path: string, bytes: Buffer) {
  if (!/\.(md|markdown|txt)$/i.test(path) || bytes.length > snapshotLimit || bytes.includes(0)) return null;
  const text = bytes.toString('utf8');
  return bytes.equals(Buffer.from(text)) ? text : null;
}

export async function recordTurnFile(
  tx: Transaction,
  owner: string,
  path: string,
  before: FileVersion | null,
  after: FileVersion | null,
) {
  const scope = trackTurnFiles.getStore();
  if (!scope || scope.owner !== owner || before?.digest === after?.digest) return;
  await tx.execute({
    sql: `INSERT INTO turn_file_changes VALUES (?,?,?,?,?,?,?,?,?)
      ON CONFLICT(owner,thread,turn,path) DO UPDATE SET
      after_digest=excluded.after_digest, after_text=excluded.after_text, updated=excluded.updated`,
    args: [
      owner,
      scope.thread,
      scope.turn,
      path,
      before?.digest ?? null,
      after?.digest ?? null,
      before?.text ?? null,
      after?.text ?? null,
      Date.now(),
    ],
  });
}

export function turnFileChangesProcessor() {
  const userSchema = z.object({ id: z.string().min(1) });
  const mutation =
    /^(?:mastra_workspace_)?(?:write_file|edit_file|delete|apply_patch|office_convert|office_render|office_recalculate)$/;
  return {
    id: 'altflow-turn-file-changes',
    processInputStep(args: ProcessInputStepArgs) {
      const user = userSchema.safeParse(args.requestContext?.getRaw(MASTRA_NORMALIZED_USER_KEY));
      const thread = args.messageList.serialize().memoryInfo?.threadId;
      const turn = [...args.messageList.get.input.db()].reverse().find(message => message.role === 'user')?.id;
      if (!user.success || !thread || !turn) return;
      const scope = { owner: user.data.id, thread, turn };
      const tools = { ...args.tools };
      for (const [name, tool] of Object.entries(tools)) {
        if (!tool || typeof tool !== 'object' || !('execute' in tool)) continue;
        const execute = tool.execute;
        const id = 'id' in tool && typeof tool.id === 'string' ? tool.id : name;
        if (!mutation.test(id) || typeof execute !== 'function') continue;
        tools[name] = {
          ...tool,
          execute: (...input: unknown[]) => trackTurnFiles.run(scope, () => execute.apply(tool, input)),
        };
      }
      return { tools };
    },
  };
}

export function fileChangeSummary(
  path: string,
  before: unknown,
  after: unknown,
  beforeText: unknown,
  afterText: unknown,
) {
  return {
    path,
    name: posix.basename(path),
    kind: before == null ? 'added' : after == null ? 'deleted' : 'modified',
    hasDiff: (before == null || typeof beforeText === 'string') && (after == null || typeof afterText === 'string'),
  };
}
