import { http, HttpResponse } from 'msw';
import { organizationSchema, organizationCommandSchema } from '../../conversation-projects-api';
import type { ConversationOrganizationState, OrganizationCommand } from '../../conversation-projects-api';
import { server } from '@/test/msw-server';

export const emptyOrganization = (): ConversationOrganizationState => ({
  projects: [],
  projectPins: [],
  pinned: [],
  collapsed: [],
  revision: 0,
});

/** Stateful HTTP fixture. Persistence and ownership are verified separately against real server storage. */
export function installOrganizationFixture(initial = emptyOrganization()) {
  let state = initial;
  const commands: OrganizationCommand[] = [];
  let fail = false;
  const flag = (values: string[], id: string, enabled?: boolean) =>
    enabled ? [...new Set([id, ...values])] : values.filter(value => value !== id);
  server.use(
    http.get('*/conversation-projects', () => HttpResponse.json(state)),
    http.post('*/conversation-projects', async ({ request }) => {
      const input: unknown = await request.json();
      const parsed = organizationCommandSchema.safeParse(input);
      if (!parsed.success) return new HttpResponse(null, { status: 400 });
      const command = parsed.data;
      commands.push(command);
      if (fail) return HttpResponse.json({ error: 'Project save failed' }, { status: 503 });
      const project = 'id' in command ? state.projects.find(project => project.id === command.id) : undefined;
      switch (command.type) {
        case 'create':
          state.projects.push({ id: command.id, name: command.name, agentId: command.agentId, threads: [] });
          break;
        case 'rename':
          if (project) project.name = command.name;
          break;
        case 'remove':
          state.projects = state.projects.filter(project => project.id !== command.id);
          break;
        case 'pinProject':
          state.projectPins = flag(state.projectPins, command.id, command.enabled);
          break;
        case 'pin':
          state.pinned = flag(state.pinned, command.id, command.enabled);
          break;
        case 'collapse':
          state.collapsed = flag(state.collapsed, command.id, command.enabled);
          break;
        case 'move':
        case 'forget':
          for (const project of state.projects) project.threads = project.threads.filter(id => id !== command.threadId);
          if (command.type === 'forget') state.pinned = state.pinned.filter(id => id !== command.threadId);
          if (command.type === 'move')
            state.projects.find(project => project.id === command.projectId)?.threads.push(command.threadId);
          break;
        case 'import':
          state = { ...organizationSchema.parse(command.state), revision: state.revision };
          break;
      }
      state.revision++;
      return HttpResponse.json(state);
    }),
  );
  return {
    get state() {
      return state;
    },
    commands,
    fail: (value: boolean) => {
      fail = value;
    },
  };
}
