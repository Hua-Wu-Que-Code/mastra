import type { ListMemoryThreadsResponse } from '@mastra/client-js';
import { getRequestContextStorageKey } from '@mastra/playground-ui/domains/request-context/hooks/use-entity-request-context';
import { useMastraClient } from '@mastra/react';
import { useAgents } from '@mastra/react/hooks/agents';
import { useQueries } from '@tanstack/react-query';
import { z } from 'zod/v4';

export type SidebarThread = ListMemoryThreadsResponse['threads'][number] & { agentId: string };
const contextSchema = z.record(z.string(), z.unknown());
function requestContextFor(agentId: string) {
  try {
    const parsed = contextSchema.safeParse(
      JSON.parse(localStorage.getItem(getRequestContextStorageKey('agent', agentId)) ?? '{}'),
    );
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}

/** Separate paginated projection; prefix invalidation keeps title/clone/delete updates shared with chat. */
export function useSidebarThreads(scope: string) {
  const client = useMastraClient();
  const agents = useAgents();
  const queries = useQueries({
    queries: Object.keys(agents.data ?? {}).map(agentId => {
      const requestContext = requestContextFor(agentId);
      return {
        queryKey: ['memory', 'threads', 'sidebar', scope, agentId, requestContext],
        queryFn: async () => {
          const memory = await client.getMemoryStatus(agentId, requestContext);
          if (!memory.result) return [];
          const threads: SidebarThread[] = [];
          let page = 0;
          let hasMore = true;
          while (hasMore) {
            const result = await client.listMemoryThreads({
              agentId,
              resourceId: agentId,
              requestContext,
              page,
              perPage: 100,
              orderBy: { field: 'updatedAt', direction: 'DESC' },
            });
            threads.push(...result.threads.map(thread => ({ ...thread, agentId })));
            hasMore = result.hasMore && result.threads.length > 0;
            page++;
          }
          return threads;
        },
        retry: false,
        refetchOnWindowFocus: false,
      };
    }),
  });
  // A shared memory store can return the same thread for multiple agents. Prefer
  // its recorded owner, then the first readable agent; render each conversation once.
  const byId = new Map<string, SidebarThread>();
  for (const query of queries) {
    for (const thread of query.data ?? []) {
      if (!byId.has(thread.id) || thread.metadata?.agentId === thread.agentId) byId.set(thread.id, thread);
    }
  }
  return {
    threads: [...byId.values()].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
    isLoading: agents.isPending || queries.some(query => query.isPending),
    error: agents.error ?? queries.find(query => query.error)?.error,
    retry: () => {
      void agents.refetch();
      queries.forEach(query => void query.refetch());
    },
  };
}
