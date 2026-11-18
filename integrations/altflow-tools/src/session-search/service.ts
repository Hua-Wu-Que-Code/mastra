import type { Client } from '@libsql/client';
import { TABLE_MESSAGES, TABLE_THREADS } from '@mastra/core/storage';
import { AltflowToolError } from '../policy';

export interface SessionSearchHit {
  threadId: string;
  title: string;
  messageId: string;
  snippet: string;
  /** Time of the matching message, not thread creation. */
  createdAt: string;
}
export interface SessionSearchService {
  search(input: {
    resourceId: string;
    query: string;
    limit: number;
    signal?: AbortSignal;
  }): Promise<{ results: SessionSearchHit[]; truncated: boolean }>;
}

/** Read-only adapter for Mastra LibSQL message storage. No DDL or secondary data copy. */
export class LibSQLSessionSearch implements SessionSearchService {
  constructor(
    private readonly client: Pick<Client, 'execute'>,
    private readonly timeoutMs = 10_000,
  ) {}

  async search({ resourceId, query, limit, signal }: Parameters<SessionSearchService['search']>[0]) {
    signal?.throwIfAborted();
    const sql = `WITH authorized AS (
      SELECT m.id, m.thread_id, m."createdAt", t.title,
        CASE WHEN json_valid(m.content) THEN
          CASE json_type(m.content)
            WHEN 'text' THEN json_extract(m.content, '$')
            WHEN 'object' THEN CASE
              WHEN json_type(m.content, '$.parts') = 'array' THEN
                (SELECT group_concat(part_text, char(10)) FROM
                  (SELECT json_extract(p.value, '$.text') AS part_text
                   FROM json_each(m.content, '$.parts') p
                   WHERE json_extract(p.value, '$.type') = 'text'
                     AND json_type(p.value, '$.text') = 'text'
                   ORDER BY CAST(p.key AS INTEGER)))
              WHEN json_type(m.content, '$.content') = 'text' THEN json_extract(m.content, '$.content')
              ELSE NULL END
            ELSE NULL END
          ELSE m.content END AS text
      FROM "${TABLE_MESSAGES}" m JOIN "${TABLE_THREADS}" t ON t.id = m.thread_id
      WHERE t."resourceId" = ? AND (m."resourceId" = ? OR m."resourceId" IS NULL)
        AND m.role IN ('user', 'assistant')
    ), hits AS (
      SELECT *, instr(lower(text), lower(?)) AS position FROM authorized
    ), ranked AS (
      SELECT *, ROW_NUMBER() OVER (PARTITION BY thread_id ORDER BY "createdAt" DESC, id DESC) AS rank
      FROM hits WHERE position > 0
    ) SELECT thread_id, substr(title, 1, 300) AS title, id,
        substr(text, max(1, position - 100), 500) AS snippet, "createdAt"
      FROM ranked WHERE rank = 1 ORDER BY "createdAt" DESC, thread_id ASC LIMIT ?`;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new AltflowToolError('SESSION_SEARCH_TIMEOUT', 'Conversation search timed out.')),
        this.timeoutMs,
      );
    });
    try {
      const result = await Promise.race([
        this.client.execute({ sql, args: [resourceId, resourceId, query, limit + 1] }),
        timeout,
      ]);
      signal?.throwIfAborted();
      return {
        results: result.rows
          .slice(0, limit)
          .map(row => ({
            threadId: String(row.thread_id),
            title: String(row.title ?? ''),
            messageId: String(row.id),
            snippet: String(row.snippet),
            createdAt: String(row.createdAt),
          })),
        truncated: result.rows.length > limit,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
