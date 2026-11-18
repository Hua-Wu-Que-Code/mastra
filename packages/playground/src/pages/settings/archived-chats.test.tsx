import { Sidebar } from '@mastra/playground-ui/components/Sidebar';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { ArchivedChatsSettingsPage } from './archived-chats';
import { adminSidebarCapabilities } from '@/components/ui/__tests__/fixtures/sidebar-permissions';
import { installOrganizationFixture } from '@/domains/navigation/__tests__/fixtures/conversation-projects';
import { sidebarAgents, sidebarThreads } from '@/domains/navigation/__tests__/fixtures/sidebar-conversations';
import { SidebarConversations } from '@/domains/navigation/components/sidebar-conversations';
import { server } from '@/test/msw-server';
import { renderWithProviders, TEST_BASE_URL } from '@/test/render';

beforeEach(() => {
  localStorage.clear();
  installOrganizationFixture();
  server.use(
    http.get(`${TEST_BASE_URL}/api/auth/capabilities`, () => HttpResponse.json({ enabled: false, login: null })),
    http.get(`${TEST_BASE_URL}/api/agents`, () => HttpResponse.json(sidebarAgents)),
    http.get(`${TEST_BASE_URL}/api/memory/status`, () => HttpResponse.json({ result: true })),
  );
});

function installArchiveHandlers() {
  let threads = sidebarThreads.threads.map(thread => ({
    ...thread,
    metadata: { owner: 'retained', altflowArchived: thread.id === 'thread-1' },
  }));
  const calls = { patches: 0, deletes: 0, failRestore: false, failDelete: false };
  server.use(
    http.get(`${TEST_BASE_URL}/api/memory/threads`, ({ request }) =>
      HttpResponse.json({
        ...sidebarThreads,
        threads: threads.filter(thread => thread.resourceId === new URL(request.url).searchParams.get('agentId')),
      }),
    ),
    http.get(`${TEST_BASE_URL}/api/memory/threads/:threadId`, ({ params }) =>
      HttpResponse.json(threads.find(thread => thread.id === params.threadId)),
    ),
    http.patch(`${TEST_BASE_URL}/api/memory/threads/:threadId`, async ({ params, request }) => {
      calls.patches++;
      if (calls.failRestore) return new HttpResponse(null, { status: 500 });
      const body = await request.json();
      expect(body.metadata).toEqual({ owner: 'retained', altflowArchived: false });
      threads = threads.map(thread =>
        thread.id === params.threadId ? { ...thread, metadata: body.metadata } : thread,
      );
      return HttpResponse.json(threads.find(thread => thread.id === params.threadId));
    }),
    http.delete(`${TEST_BASE_URL}/api/memory/threads/:threadId`, ({ params, request }) => {
      calls.deletes++;
      if (calls.failDelete) return new HttpResponse(null, { status: 500 });
      expect(new URL(request.url).searchParams.get('agentId')).toBe('agent-1');
      threads = threads.filter(thread => thread.id !== params.threadId);
      return HttpResponse.json({ success: true });
    }),
  );
  return calls;
}

function renderArchives() {
  return renderWithProviders(
    <Routes>
      <Route path="/settings/archived-chats" element={<ArchivedChatsSettingsPage />} />
      <Route
        path="/chat/:agentId/threads/:threadId"
        element={
          <Sidebar.Provider>
            <SidebarConversations />
          </Sidebar.Provider>
        }
      />
    </Routes>,
    {
      router: {
        initialEntries: [{ pathname: '/settings/archived-chats', state: { returnTo: '/chat/agent-1/threads/new' } }],
      },
    },
  );
}

describe('Archived chats settings', () => {
  describe('when a saved archive is opened', () => {
    it('restores the chat to the sidebar and preserves the server state after remounting', async () => {
      const calls = installArchiveHandlers();
      renderArchives();
      const list = await screen.findByRole('list', { name: 'Archived chats' });
      expect(within(list).getByRole('link', { name: 'Trip planning' })).toBeTruthy();
      expect(within(list).queryByText('Recent research')).toBeNull();
      fireEvent.click(within(list).getByRole('button', { name: 'Unarchive' }));
      expect(await screen.findByText('No archived chats')).toBeTruthy();
      expect(calls.patches).toBe(1);
      cleanup();
      localStorage.clear();
      renderArchives();
      expect(await screen.findByText('No archived chats')).toBeTruthy();
      fireEvent.click(screen.getByRole('link', { name: 'Back to app' }));
      expect(await screen.findByRole('link', { name: 'Trip planning' })).toBeTruthy();
    });
  });

  describe('when restoring fails', () => {
    it('keeps the archive available and lets the user retry', async () => {
      const calls = installArchiveHandlers();
      calls.failRestore = true;
      renderArchives();
      fireEvent.click(await screen.findByRole('button', { name: 'Unarchive' }));
      expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Failed to unarchive chat');
      expect(screen.getByRole('link', { name: 'Trip planning' })).toBeTruthy();
      calls.failRestore = false;
      fireEvent.click(screen.getByRole('button', { name: 'Unarchive' }));
      expect(await screen.findByText('No archived chats')).toBeTruthy();
      expect(calls.patches).toBe(2);
    });
  });

  describe('when deleting an archive fails', () => {
    it('requires confirmation, keeps the archive on failure, then deletes it on retry', async () => {
      const calls = installArchiveHandlers();
      calls.failDelete = true;
      renderArchives();
      fireEvent.click(await screen.findByRole('button', { name: 'Delete', exact: true }));
      expect(await screen.findByRole('alertdialog')).toBeTruthy();
      expect(calls.deletes).toBe(0);
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
      expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Failed to delete chat');
      calls.failDelete = false;
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
      expect(await screen.findByText('No archived chats')).toBeTruthy();
      expect(screen.queryByRole('link', { name: 'Trip planning' })).toBeNull();
      expect(calls.deletes).toBe(2);
    });
  });

  describe('when loading archives fails', () => {
    it('shows an error instead of an empty archive and reloads on retry', async () => {
      installArchiveHandlers();
      server.use(http.get(`${TEST_BASE_URL}/api/memory/threads`, () => new HttpResponse(null, { status: 503 })));
      renderArchives();
      expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Failed to load archived chats');
      expect(screen.queryByText('No archived chats')).toBeNull();
      installArchiveHandlers();
      fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
      expect(await screen.findByRole('link', { name: 'Trip planning' })).toBeTruthy();
    });
  });

  describe('when the user can only read memory', () => {
    it('shows archives without restore or delete actions', async () => {
      installArchiveHandlers();
      server.use(
        http.get(`${TEST_BASE_URL}/api/auth/capabilities`, () =>
          HttpResponse.json({
            ...adminSidebarCapabilities,
            access: { roles: ['reader'], permissions: ['agents:read', 'memory:read'] },
          }),
        ),
      );
      renderArchives();
      expect(await screen.findByRole('link', { name: 'Trip planning' })).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Unarchive' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Delete', exact: true })).toBeNull();
    });
  });
});
