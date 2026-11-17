import type { ListMemoryThreadsResponse, MastraClient } from '@mastra/client-js';
import { v2Agent } from '@/lib/ai-ui/__tests__/fixtures/agent';

export const sidebarAgents: Awaited<ReturnType<MastraClient['listAgents']>> = {
  'agent-1': v2Agent,
  'agent-2': { ...v2Agent, id: 'agent-2', name: 'Research agent' },
};
export const sidebarThreads: ListMemoryThreadsResponse = {
  threads: [
    {
      id: 'thread-1',
      title: 'Trip planning',
      resourceId: 'agent-1',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      metadata: {},
    },
    {
      id: 'thread-2',
      title: 'Recent research',
      resourceId: 'agent-2',
      createdAt: '2026-01-02',
      updatedAt: '2026-01-02',
      metadata: {},
    },
  ],
  total: 2,
  page: 0,
  perPage: 100,
  hasMore: false,
};
