import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { ProjectSources } from '../components/project-sources';
import type { ConversationProject } from '../use-conversation-projects';
import { sidebarAgents, sidebarThreads } from './fixtures/sidebar-conversations';
import { StudioConfigContext } from '@/domains/configuration/context/studio-config-state';
import { fileMessages, filesFixture } from '@/domains/conversation/files/__tests__/fixtures/files';
import { server } from '@/test/msw-server';
import { renderWithProviders, TEST_BASE_URL } from '@/test/render';

const project: ConversationProject = { id: 'writing', name: 'Writing', agentId: 'agent-1', threads: ['thread-1'] };
function show(selected = project) {
  return renderWithProviders(
    <StudioConfigContext.Provider
      value={{ baseUrl: TEST_BASE_URL, headers: {}, isLoading: false, setConfig: () => {} }}
    >
      <ProjectSources project={selected} />
    </StudioConfigContext.Provider>,
  );
}
beforeEach(() => {
  localStorage.clear();
  server.use(
    http.get(`${TEST_BASE_URL}/api/auth/capabilities`, () => HttpResponse.json({ enabled: false })),
    http.get(`${TEST_BASE_URL}/api/agents`, () => HttpResponse.json(sidebarAgents)),
    http.get(`${TEST_BASE_URL}/api/memory/status`, () => HttpResponse.json({ result: true })),
    http.get(`${TEST_BASE_URL}/api/memory/threads`, ({ request }) =>
      HttpResponse.json({
        ...sidebarThreads,
        threads: sidebarThreads.threads.filter(
          thread => thread.resourceId === new URL(request.url).searchParams.get('agentId'),
        ),
      }),
    ),
    http.get(`${TEST_BASE_URL}/storage`, () => HttpResponse.json(filesFixture)),
  );
});
describe('Project sources', () => {
  describe('when other conversations have files', () => {
    it('lists only files referenced by chats in the selected project', async () => {
      server.use(
        http.get(`${TEST_BASE_URL}/api/memory/threads/thread-1/messages`, () =>
          HttpResponse.json({ messages: fileMessages.slice(0, 2), hasMore: false }),
        ),
      );
      show();
      expect(await screen.findByRole('button', { name: 'notes.txt' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'draft.md' })).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'cover.png' })).toBeNull();
    });
    it('keeps an empty project empty', async () => {
      show({ ...project, threads: [] });
      expect(await screen.findByText('No files found.')).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'notes.txt' })).toBeNull();
    });
  });
});
