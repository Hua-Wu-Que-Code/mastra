import { Sidebar } from '@mastra/playground-ui/components/Sidebar';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { SidebarConversations } from '../components/sidebar-conversations';
import { sidebarAgents, sidebarThreads } from './fixtures/sidebar-conversations';
import { viewerSidebarCapabilities } from '@/components/ui/__tests__/fixtures/sidebar-permissions';
import { server } from '@/test/msw-server';
import { renderWithProviders, TEST_BASE_URL } from '@/test/render';

beforeEach(() => {
  localStorage.clear();
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
    { router: { initialEntries: ['/agents/agent-1/threads/thread-1'] } },
  );

describe('Sidebar conversations', () => {
  describe('when the user can read agents but cannot read memory', () => {
    it('keeps new chat and capability access without requesting conversation history', async () => {
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
      expect(await screen.findByRole('button', { name: 'Show capability details' })).toBeTruthy();
      expect(screen.queryByRole('region', { name: 'Recent' })).toBeNull();
      expect(historyRequests).toBe(0);
    });
  });
  describe('when conversations belong to different agents', () => {
    it('lists them by latest activity with links to the owning agent', async () => {
      renderConversations();
      const recent = await screen.findByRole('region', { name: 'Recent' });
      await within(recent).findByText('Recent research');
      const links = within(recent).getAllByRole('link');
      expect(links.map(link => link.textContent)).toEqual(['Recent research', 'Trip planning']);
      expect(links[0].getAttribute('href')).toBe('/agents/agent-2/threads/thread-2');
    });
    it('collapses recent conversations and restores the choice after remounting', async () => {
      const view = renderConversations();
      await screen.findByText('Trip planning');
      fireEvent.click(screen.getByRole('button', { name: 'Recent' }));
      await waitFor(() => expect(screen.queryByText('Trip planning')).toBeNull());
      view.unmount();
      renderConversations();
      expect((await screen.findByRole('button', { name: 'Recent' })).getAttribute('aria-expanded')).toBe('false');
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
    it('moves a conversation into the project without changing its destination', async () => {
      renderConversations();
      await screen.findByText('Trip planning');
      fireEvent.click(screen.getByRole('button', { name: 'New project' }));
      fireEvent.change(screen.getByRole('textbox', { name: 'Project name' }), { target: { value: 'My writing' } });
      fireEvent.click(screen.getByRole('button', { name: 'Create' }));
      const recent = screen.getByRole('region', { name: 'Recent' });
      fireEvent.click(within(recent).getAllByRole('button', { name: 'Thread actions' })[1]);
      fireEvent.click(await screen.findByRole('menuitem', { name: 'My writing' }));
      const projects = screen.getByRole('region', { name: 'Projects' });
      expect(within(projects).getByRole('link', { name: 'Trip planning' }).getAttribute('href')).toBe(
        '/agents/agent-1/threads/thread-1',
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
  describe('when the original conversation list had a pinned chat', () => {
    it('preserves the pin at the top of Recent', async () => {
      localStorage.setItem('mastra:pinned-threads:agent:agent-1', JSON.stringify(['thread-1']));
      renderConversations();
      const recent = await screen.findByRole('region', { name: 'Recent' });
      await within(recent).findByText('Recent research');
      expect(within(recent).getAllByRole('link')[0].textContent).toBe('Trip planning');
    });
  });
});
