import { useMastraClient } from '@mastra/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { SidebarThread } from './use-sidebar-threads';

export function isThreadArchived(thread: SidebarThread) {
  return thread.metadata?.altflowArchived === true;
}

export function useThreadArchive(requestContext: Record<string, unknown>) {
  const client = useMastraClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ thread, archived }: { thread: SidebarThread; archived: boolean }) => {
      const resource = client.getMemoryThread({ threadId: thread.id, agentId: thread.agentId });
      // Metadata writes replace the object. Read the latest version so a stale sidebar
      // row cannot discard working-memory or other metadata added since it loaded.
      const current = await resource.get(requestContext);
      return resource.update({
        requestContext,
        metadata: { ...current.metadata, altflowArchived: archived },
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['memory', 'threads'] }),
        queryClient.invalidateQueries({ queryKey: ['memory', 'thread'] }),
      ]);
    },
  });
}
