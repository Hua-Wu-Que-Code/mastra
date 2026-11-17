import { useLocalStorageState } from '@mastra/playground-ui/hooks/use-local-storage-state';
import { z } from 'zod/v4';
const schema = z.object({
  projects: z.array(z.object({ id: z.string(), name: z.string(), threads: z.array(z.string()) })),
  pinned: z.array(z.string()),
  collapsed: z.array(z.string()),
});
export type ConversationProject = z.infer<typeof schema>['projects'][number];

/** Browser organization preferences, isolated by server and signed-in user. Message content stays on the server. */
function readLegacyPins(): string[] {
  try {
    return Object.keys(localStorage)
      .filter(key => key.startsWith('mastra:pinned-threads:agent:'))
      .flatMap(key => {
        const result = z.array(z.string()).safeParse(JSON.parse(localStorage.getItem(key) ?? '[]'));
        return result.success ? result.data : [];
      });
  } catch {
    return [];
  }
}
export function useConversationProjects(scope: string) {
  const [state, setState] = useLocalStorageState({
    initialKey: `mastra:conversation-projects:${scope}`,
    schema,
    defaultValue: { projects: [], pinned: readLegacyPins(), collapsed: [] },
  });
  return {
    ...state,
    create: (name: string) =>
      setState(s => ({ ...s, projects: [...s.projects, { id: crypto.randomUUID(), name, threads: [] }] })),
    rename: (id: string, name: string) =>
      setState(s => ({ ...s, projects: s.projects.map(p => (p.id === id ? { ...p, name } : p)) })),
    remove: (id: string) => setState(s => ({ ...s, projects: s.projects.filter(p => p.id !== id) })),
    move: (threadId: string, projectId?: string) =>
      setState(s => ({
        ...s,
        projects: s.projects.map(p => ({
          ...p,
          threads:
            p.id === projectId ? [...new Set([...p.threads, threadId])] : p.threads.filter(id => id !== threadId),
        })),
      })),
    pin: (id: string) =>
      setState(s => ({ ...s, pinned: s.pinned.includes(id) ? s.pinned.filter(t => t !== id) : [id, ...s.pinned] })),
    toggle: (id: string) =>
      setState(s => ({
        ...s,
        collapsed: s.collapsed.includes(id) ? s.collapsed.filter(t => t !== id) : [...s.collapsed, id],
      })),
  };
}
export type ConversationOrganization = ReturnType<typeof useConversationProjects>;
