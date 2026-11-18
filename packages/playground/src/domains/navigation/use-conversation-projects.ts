import { toast } from '@mastra/playground-ui/utils/toast';
import { useMastraClient } from '@mastra/react';
import { useAuthCapabilities } from '@mastra/react/hooks/auth';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { organizationRequest, organizationSchema } from './conversation-projects-api';
import type { ConversationOrganizationState, OrganizationCommand } from './conversation-projects-api';
export type { ConversationProject } from './conversation-projects-api';

const empty: ConversationOrganizationState = { projects: [], projectPins: [], pinned: [], collapsed: [], revision: 0 };

/** Server commands own project state. Local storage is read only to import this account's old data once. */
export function useConversationProjects(scope: string) {
  const client = useMastraClient();
  const queries = useQueryClient();
  const auth = useAuthCapabilities({ queryOptions: { retryOnMount: false } });
  const key = ['conversation-projects', scope];
  const storageKey = `mastra:conversation-projects:${scope}`;
  const query = useQuery({
    queryKey: key,
    enabled: Boolean(auth.data),
    queryFn: async () => {
      const state = await organizationRequest(client);
      let legacy: string | null = null;
      try {
        legacy = localStorage.getItem(storageKey);
      } catch {
        return state;
      }
      if (!legacy) return state;
      let value: unknown;
      try {
        value = JSON.parse(legacy);
      } catch {
        return state;
      }
      const parsed = organizationSchema.safeParse(value);
      if (!parsed.success) return state;
      const imported = await organizationRequest(client, { type: 'import', state: parsed.data });
      // Do not lose edits made by another tab while this import was in flight.
      try {
        if (localStorage.getItem(storageKey) === legacy) localStorage.removeItem(storageKey);
      } catch {
        /* Server import already succeeded. */
      }
      return imported;
    },
    retry: false,
  });
  const mutation = useMutation({
    scope: { id: `conversation-projects:${scope}` },
    mutationFn: (command: OrganizationCommand) => organizationRequest(client, command),
    onMutate: async () => {
      await queries.cancelQueries({ queryKey: key });
    },
    onSuccess: state => {
      queries.setQueryData<ConversationOrganizationState>(key, current =>
        !current || state.revision >= current.revision ? state : current,
      );
    },
    onError: error => {
      toast.error(error.message);
    },
    onSettled: async (_state, _error, command) => {
      await queries.invalidateQueries({ queryKey: key });
      if (command.type === 'remove') await queries.invalidateQueries({ queryKey: ['memory', 'threads'] });
    },
  });
  const state = query.data ?? empty;
  const send = mutation.mutateAsync;
  return {
    ...state,
    isLoading: query.isPending,
    isSaving: mutation.isPending,
    error: query.error,
    retry: () => void query.refetch(),
    create: async (name: string, agentId?: string) => {
      const id = crypto.randomUUID();
      const saved = await send({ type: 'create', id, name, agentId });
      const project = saved.projects.find(project => project.id === id);
      if (!project) throw new Error('Project not found');
      return project;
    },
    rename: (id: string, name: string) => send({ type: 'rename', id, name }),
    remove: (id: string) => send({ type: 'remove', id }),
    pinProject: (id: string) => send({ type: 'pinProject', id, enabled: !state.projectPins.includes(id) }),
    move: (threadId: string, projectId?: string) => send({ type: 'move', threadId, projectId }),
    forget: (threadId: string) => send({ type: 'forget', threadId }),
    setPinned: (id: string, enabled: boolean) => send({ type: 'pin', id, enabled }),
    pin: (id: string) => send({ type: 'pin', id, enabled: !state.pinned.includes(id) }),
    toggle: (id: string) => send({ type: 'collapse', id, enabled: !state.collapsed.includes(id) }),
  };
}
export type ConversationOrganization = ReturnType<typeof useConversationProjects>;
