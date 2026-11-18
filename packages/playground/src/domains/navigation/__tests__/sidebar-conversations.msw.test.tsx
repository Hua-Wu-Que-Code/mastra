import { Sidebar } from '@mastra/playground-ui/components/Sidebar';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { SidebarConversations } from '../components/sidebar-conversations';
import { installOrganizationFixture } from './fixtures/conversation-projects';
import { sidebarAgents, sidebarThreads } from './fixtures/sidebar-conversations';
import { viewerSidebarCapabilities } from '@/components/ui/__tests__/fixtures/sidebar-permissions';
import { server } from '@/test/msw-server';
import { renderWithProviders, TEST_BASE_URL } from '@/test/render';

beforeEach(() => {
  localStorage.clear();
  installOrganizationFixture();
  server.use(
    http.get(`${TEST_BASE_URL}/api/agents/:id`, () => HttpResponse.json(sidebarAgents['agent-1'])),
    http.get(`${TEST_BASE_URL}/api/agents`, () => HttpResponse.json(sidebarAgents)),
    http.get(`${TEST_BASE_URL}/api/auth/capabilities`, () => HttpResponse.json({ enabled: false, login: null })),
    http.get(`${TEST_BASE_URL}/api/memory/status`, () => HttpResponse.json({ result: true })),
    http.get(`${TEST_BASE_URL}/api/memory/threads`, ({ request }) => {
      const agentId = new URL(request.url).searchParams.get('agentId');
      return HttpResponse.json({
        ...sidebarThreads,
        threads: sidebarThreads.threads.filter(t => t.resourceId === agentId),
      });
    }),
  );
});
const renderConversations = () =>
  renderWithProviders(
    <Sidebar.Provider>
      <SidebarConversations />
    </Sidebar.Provider>,
    { router: { initialEntries: ['/chat/agent-1/threads/thread-1'] } },
  );

describe('Sidebar conversations', () => {
  it('offers new chat before the first conversation exists, including outside agent pages', async () => {
    server.use(http.get(`${TEST_BASE_URL}/api/memory/threads`, () => HttpResponse.json({ threads: [] })));
    renderWithProviders(
      <Sidebar.Provider>
        <SidebarConversations />
      </Sidebar.Provider>,
      { router: { initialEntries: ['/workflows'] } },
    );
    expect((await screen.findByRole('link', { name: 'New Thread' })).getAttribute('href')).toBe(
      '/chat/agent-1/threads/new',
    );
    expect(await screen.findByText('No recent conversations')).toBeTruthy();
  });

  describe('when the user can read agents but cannot read memory', () => {
    it('keeps new chat without advertising capabilities or requesting history', async () => {
      let historyRequests = 0;
      server.use(
        http.get(`${TEST_BASE_URL}/api/auth/capabilities`, () => HttpResponse.json(viewerSidebarCapabilities)),
        http.get(`${TEST_BASE_URL}/api/memory/threads`, () => {
          historyRequests++;
          return HttpResponse.json(sidebarThreads);
        }),
      );
      renderConversations();
      expect(await screen.findByRole('link', { name: 'New Thread' })).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Show capability details' })).toBeNull();
      expect(screen.queryByRole('region', { name: 'Recent' })).toBeNull();
      expect(historyRequests).toBe(0);
    });
  });
  describe('when archiving a conversation', () => {
    it('persists on the server and stays hidden after local preferences are cleared', async () => {
      let archived = false;
      server.use(
        http.get(`${TEST_BASE_URL}/api/memory/threads/thread-1`, () =>
          HttpResponse.json({ ...sidebarThreads.threads[0], metadata: { owner: 'retained' } }),
        ),
        http.patch(`${TEST_BASE_URL}/api/memory/threads/thread-1`, async ({ request }) => {
          const body = await request.json();
          expect(body).toMatchObject({ metadata: { owner: 'retained', altflowArchived: true } });
          archived = true;
          return HttpResponse.json({ ...sidebarThreads.threads[0], ...body });
        }),
        http.get(`${TEST_BASE_URL}/api/memory/threads`, ({ request }) => {
          const agentId = new URL(request.url).searchParams.get('agentId');
          return HttpResponse.json({
            ...sidebarThreads,
            threads: sidebarThreads.threads
              .filter(t => t.resourceId === agentId)
              .map(t => (t.id === 'thread-1' ? { ...t, metadata: { altflowArchived: archived } } : t)),
          });
        }),
      );
      renderConversations();
      await screen.findByText('Trip planning');
      const recent = screen.getByRole('region', { name: 'Recent' });
      fireEvent.click(within(recent).getAllByRole('button', { name: 'Thread actions' })[1]);
      fireEvent.click(await screen.findByRole('menuitem', { name: 'Archive', exact: true }));
      await waitFor(() => expect(screen.queryByText('Trip planning')).toBeNull());
      expect(archived).toBe(true);
      cleanup();
      localStorage.clear();
      renderConversations();
      await screen.findByText('Recent research');
      expect(screen.queryByText('Trip planning')).toBeNull();
    });

    it('keeps the conversation visible when saving the archive fails and allows retrying', async () => {
      server.use(
        http.get(`${TEST_BASE_URL}/api/memory/threads/thread-1`, () => HttpResponse.json(sidebarThreads.threads[0])),
        http.patch(`${TEST_BASE_URL}/api/memory/threads/thread-1`, () => new HttpResponse(null, { status: 500 })),
      );
      renderConversations();
      await screen.findByText('Trip planning');
      fireEvent.click(screen.getAllByRole('button', { name: 'Thread actions' })[1]);
      fireEvent.click(await screen.findByRole('menuitem', { name: 'Archive', exact: true }));
      expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Failed to archive chat');
      expect(screen.getByRole('link', { name: 'Trip planning' })).toBeTruthy();
    });
  });

  describe('when conversations belong to different agents', () => {
    it('lists them by latest activity with links to the owning agent', async () => {
      renderConversations();
      const recent = await screen.findByRole('region', { name: 'Recent' });
      await within(recent).findByText('Recent research');
      const links = within(recent).getAllByRole('link');
      expect(links.map(link => link.textContent)).toEqual(['Recent research', 'Trip planning']);
      expect(links[0].getAttribute('href')).toBe('/chat/agent-2/threads/thread-2');
    });
    it('collapses recent conversations and restores the choice after remounting', async () => {
      const view = renderConversations();
      await screen.findByText('Trip planning');
      fireEvent.click(screen.getByRole('button', { name: 'Recent' }));
      await waitFor(() => expect(screen.queryByText('Trip planning')).toBeNull());
      view.unmount();
      renderConversations();
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Recent' }).getAttribute('aria-expanded')).toBe('false'),
      );
    });
    it('refreshes generated titles while the conversation remains open', async () => {
      const { queryClient } = renderConversations();
      await screen.findByText('Trip planning');
      server.use(
        http.get(`${TEST_BASE_URL}/api/memory/threads`, () =>
          HttpResponse.json({ ...sidebarThreads, threads: [{ ...sidebarThreads.threads[0], title: 'Updated title' }] }),
        ),
      );
      await queryClient.invalidateQueries({ queryKey: ['memory', 'threads'] });
      expect(await screen.findByText('Updated title')).toBeTruthy();
      expect(screen.queryByText('Trip planning')).toBeNull();
    });
  });
  describe('when a project is created', () => {
    it('keeps the entered name and retries when creating a project fails', async () => {
      const fixture = installOrganizationFixture();
      renderConversations();
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'New project' }).hasAttribute('disabled')).toBe(false),
      );
      fireEvent.click(screen.getByRole('button', { name: 'New project' }));
      const dialog = screen.getByRole('dialog');
      fireEvent.change(within(dialog).getByRole('textbox', { name: 'Project name' }), {
        target: { value: 'My writing' },
      });
      fixture.fail(true);
      fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));
      expect(await within(dialog).findByRole('alert')).toHaveProperty('textContent', 'Project save failed');
      expect(within(dialog).getByRole('textbox', { name: 'Project name' })).toHaveProperty('value', 'My writing');
      expect(screen.queryByRole('link', { name: 'My writing', exact: true })).toBeNull();
      fixture.fail(false);
      fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));
      await screen.findByRole('link', { name: 'My writing', exact: true });
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });

    it('keeps the project when server deletion fails and allows retrying', async () => {
      const fixture = installOrganizationFixture({
        projects: [{ id: 'writing', name: 'My writing', agentId: 'agent-1', threads: ['thread-1'] }],
        projectPins: [],
        pinned: [],
        collapsed: [],
        revision: 1,
      });
      renderConversations();
      await screen.findByText('Trip planning');
      fireEvent.click(await screen.findByRole('button', { name: 'Project actions' }));
      fireEvent.click(await screen.findByRole('menuitem', { name: 'Delete project' }));
      const dialog = await screen.findByRole('alertdialog');
      fixture.fail(true);
      fireEvent.click(within(dialog).getByRole('button', { name: 'Delete project' }));
      expect(await within(dialog).findByRole('alert')).toHaveProperty('textContent', 'Project save failed');
      expect(screen.getByText('My writing', { exact: true })).toBeTruthy();
      fixture.fail(false);
      fireEvent.click(within(dialog).getByRole('button', { name: 'Delete project' }));
      await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
      expect(fixture.commands.filter(command => command.type === 'remove')).toHaveLength(2);
    });

    it('offers a project homepage, a dedicated new chat, and project pinning', async () => {
      renderConversations();
      await screen.findByText('Trip planning');
      fireEvent.click(screen.getByRole('button', { name: 'New project' }));
      fireEvent.change(screen.getByRole('textbox', { name: 'Project name' }), { target: { value: 'My writing' } });
      fireEvent.click(screen.getByRole('button', { name: 'Create' }));
      const project = await screen.findByRole('link', { name: 'My writing', exact: true });
      expect(project.getAttribute('href')).toMatch(/^\/chat\/agent-1\/projects\//);
      expect(screen.getByRole('link', { name: 'New chat in My writing' }).getAttribute('href')).toContain('?project=');
      fireEvent.click(screen.getByRole('button', { name: 'Project actions' }));
      fireEvent.click(await screen.findByRole('menuitem', { name: 'Pin project' }));
      await waitFor(() => expect(screen.queryByRole('menuitem', { name: 'Pin project' })).toBeNull());
      fireEvent.click(screen.getByRole('button', { name: 'Project actions' }));
      expect(await screen.findByRole('menuitem', { name: 'Unpin project' })).toBeTruthy();
    });

    it('requires confirmation before deleting its chats on the server', async () => {
      const fixture = installOrganizationFixture();
      renderConversations();
      await screen.findByText('Trip planning');
      fireEvent.click(screen.getByRole('button', { name: 'New project' }));
      fireEvent.change(screen.getByRole('textbox', { name: 'Project name' }), { target: { value: 'My writing' } });
      fireEvent.click(screen.getByRole('button', { name: 'Create' }));
      await screen.findByRole('link', { name: 'My writing', exact: true });
      const recent = screen.getByRole('region', { name: 'Recent' });
      fireEvent.click(within(recent).getAllByRole('button', { name: 'Thread actions' })[1]);
      fireEvent.click(await screen.findByRole('menuitem', { name: 'My writing' }));
      fireEvent.click(screen.getByRole('button', { name: 'Project actions' }));
      fireEvent.click(await screen.findByRole('menuitem', { name: 'Delete project' }));
      expect(fixture.commands.some(command => command.type === 'remove')).toBe(false);
      const dialog = await screen.findByRole('alertdialog');
      fireEvent.click(within(dialog).getByRole('button', { name: 'Delete project' }));
      await waitFor(() => expect(fixture.commands.some(command => command.type === 'remove')).toBe(true));
      await waitFor(() => expect(screen.queryByRole('link', { name: 'My writing' })).toBeNull());
    });

    it('moves a conversation into the project without changing its destination', async () => {
      renderConversations();
      await screen.findByText('Trip planning');
      fireEvent.click(screen.getByRole('button', { name: 'New project' }));
      fireEvent.change(screen.getByRole('textbox', { name: 'Project name' }), { target: { value: 'My writing' } });
      fireEvent.click(screen.getByRole('button', { name: 'Create' }));
      await screen.findByRole('link', { name: 'My writing', exact: true });
      const recent = screen.getByRole('region', { name: 'Recent' });
      fireEvent.click(within(recent).getAllByRole('button', { name: 'Thread actions' })[1]);
      fireEvent.click(await screen.findByRole('menuitem', { name: 'My writing' }));
      const projects = screen.getByRole('region', { name: 'Projects' });
      expect((await within(projects).findByRole('link', { name: 'Trip planning' })).getAttribute('href')).toBe(
        '/chat/agent-1/threads/thread-1',
      );
      expect(within(recent).queryByText('Trip planning')).toBeNull();
    });
  });

  describe('when editing a recent conversation', () => {
    it('renames through the existing endpoint and refreshes the visible title', async () => {
      let title = 'Trip planning';
      server.use(
        http.get(`${TEST_BASE_URL}/api/memory/threads`, () =>
          HttpResponse.json({ ...sidebarThreads, threads: [{ ...sidebarThreads.threads[0], title }] }),
        ),
        http.patch(`${TEST_BASE_URL}/api/memory/threads/thread-1`, async ({ request }) => {
          const body = await request.json();
          if (typeof body !== 'object' || body === null || !('title' in body) || typeof body.title !== 'string')
            return new HttpResponse(null, { status: 400 });
          title = body.title;
          return HttpResponse.json({ ...sidebarThreads.threads[0], title });
        }),
      );
      renderConversations();
      await screen.findByText('Trip planning');
      fireEvent.click(screen.getByRole('button', { name: 'Thread actions' }));
      fireEvent.click(await screen.findByRole('menuitem', { name: 'Rename' }));
      fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), { target: { value: 'Renamed chat' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      expect(await screen.findByRole('link', { name: 'Renamed chat' })).toBeTruthy();
    });
    it('finishes metadata cleanup when retrying an already deleted chat', async () => {
      const fixture = installOrganizationFixture({
        projects: [],
        pinned: ['thread-1'],
        projectPins: [],
        collapsed: [],
        revision: 1,
      });
      let deleted = false;
      server.use(
        http.get(`${TEST_BASE_URL}/api/memory/threads`, () =>
          HttpResponse.json({ ...sidebarThreads, threads: deleted ? [] : [sidebarThreads.threads[0]] }),
        ),
        http.delete(`${TEST_BASE_URL}/api/memory/threads/thread-1`, () => {
          if (deleted) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
          deleted = true;
          return HttpResponse.json({ success: true });
        }),
      );
      renderConversations();
      await screen.findByText('Trip planning');
      fireEvent.click(screen.getByRole('button', { name: 'Thread actions' }));
      fireEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }));
      fixture.fail(true);
      fireEvent.click(await screen.findByRole('button', { name: 'Continue' }));
      expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Failed to delete chat');
      fixture.fail(false);
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
      await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
      expect(fixture.commands.filter(command => command.type === 'forget')).toHaveLength(2);
      expect(fixture.state.pinned).toEqual([]);
      expect(screen.queryByText('Trip planning')).toBeNull();
    });

    it('keeps the row if deletion fails and allows retrying', async () => {
      let fail = true;
      let deleted = false;
      let deleteAttempts = 0;
      server.use(
        http.get(`${TEST_BASE_URL}/api/memory/threads`, () =>
          HttpResponse.json({ ...sidebarThreads, threads: deleted ? [] : [sidebarThreads.threads[0]] }),
        ),
        http.delete(`${TEST_BASE_URL}/api/memory/threads/thread-1`, () => {
          deleteAttempts += 1;
          if (fail) return new HttpResponse(null, { status: 500 });
          deleted = true;
          return HttpResponse.json({ success: true });
        }),
      );
      renderConversations();
      await screen.findByText('Trip planning');
      fireEvent.click(screen.getByRole('button', { name: 'Thread actions' }));
      fireEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }));
      fireEvent.click(await screen.findByRole('button', { name: 'Continue' }));
      await waitFor(() => {
        expect(deleteAttempts).toBe(1);
        expect(screen.getByRole('button', { name: 'Continue' }).hasAttribute('disabled')).toBe(false);
      });
      expect(screen.getByRole('link', { name: 'Trip planning', hidden: true })).toBeTruthy();
      fail = false;
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
      await waitFor(() => expect(screen.queryByText('Trip planning')).toBeNull());
    });
  });
  describe('when the conversation list has another page', () => {
    it('keeps older conversations reachable after migration', async () => {
      server.use(
        http.get(`${TEST_BASE_URL}/api/memory/threads`, ({ request }) => {
          const url = new URL(request.url);
          if (url.searchParams.get('agentId') !== 'agent-1')
            return HttpResponse.json({ ...sidebarThreads, threads: [] });
          const page = Number(url.searchParams.get('page'));
          return HttpResponse.json({
            ...sidebarThreads,
            threads: [sidebarThreads.threads[page]],
            hasMore: page === 0,
            page,
          });
        }),
      );
      renderConversations();
      expect(await screen.findByText('Trip planning')).toBeTruthy();
      expect(await screen.findByText('Recent research')).toBeTruthy();
    });
  });
  describe('when the account has a pinned chat', () => {
    it('preserves the pin at the top of Recent', async () => {
      installOrganizationFixture({ projects: [], projectPins: [], pinned: ['thread-1'], collapsed: [], revision: 1 });
      renderConversations();
      const recent = await screen.findByRole('region', { name: 'Recent' });
      await within(recent).findByText('Recent research');
      expect(within(recent).getAllByRole('link')[0].textContent).toBe('Trip planning');
    });
  });
});
