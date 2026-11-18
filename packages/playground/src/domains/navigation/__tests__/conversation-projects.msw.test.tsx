import { act, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { useConversationProjects } from '../use-conversation-projects';
import { installOrganizationFixture } from './fixtures/conversation-projects';
import { server } from '@/test/msw-server';
import { renderHookWithProviders, TEST_BASE_URL } from '@/test/render';

beforeEach(() => {
  server.use(
    http.get(`${TEST_BASE_URL}/api/auth/capabilities`, () => HttpResponse.json({ enabled: false, login: null })),
  );
});

describe('Account conversation projects', () => {
  describe('when the account already has projects on the server', () => {
    it('restores project membership in a fresh browser without local storage', async () => {
      localStorage.clear();
      server.use(
        http.get(`${TEST_BASE_URL}/conversation-projects`, () =>
          HttpResponse.json({
            projects: [{ id: 'writing', name: 'Writing', threads: ['thread-1'] }],
            projectPins: ['writing'],
            pinned: ['thread-1'],
            collapsed: [],
            revision: 3,
          }),
        ),
      );
      const first = renderHookWithProviders(() => useConversationProjects('account-alice'));
      await waitFor(() => expect(first.result.current.projects[0]?.name).toBe('Writing'));
      first.unmount();
      localStorage.clear();
      const second = renderHookWithProviders(() => useConversationProjects('account-alice'));
      await waitFor(() => expect(second.result.current.projects[0]?.threads).toEqual(['thread-1']));
      expect(second.result.current.projectPins).toEqual(['writing']);
    });
  });
  describe('when migrating browser data', () => {
    it('imports only the active account and clears its backup only after the server saves it', async () => {
      localStorage.clear();
      const legacy = {
        projects: [{ id: 'old', name: 'Old writing', threads: [] }],
        projectPins: [],
        pinned: [],
        collapsed: [],
      };
      localStorage.setItem('mastra:conversation-projects:alice', JSON.stringify(legacy));
      localStorage.setItem('mastra:conversation-projects:bob', JSON.stringify(legacy));
      const fixture = installOrganizationFixture();
      fixture.fail(true);
      const view = renderHookWithProviders(() => useConversationProjects('alice'));
      await waitFor(() => expect(view.result.current.error?.message).toBe('Project save failed'));
      expect(localStorage.getItem('mastra:conversation-projects:alice')).toBeTruthy();
      fixture.fail(false);
      act(() => view.result.current.retry());
      await waitFor(() => expect(view.result.current.projects[0]?.name).toBe('Old writing'));
      expect(localStorage.getItem('mastra:conversation-projects:alice')).toBeNull();
      expect(localStorage.getItem('mastra:conversation-projects:bob')).toBeTruthy();
    });

    it('continues reading server projects when a local backup is malformed', async () => {
      localStorage.clear();
      localStorage.setItem('mastra:conversation-projects:alice', '{invalid');
      installOrganizationFixture({
        projects: [{ id: 'server', name: 'Server writing', threads: [] }],
        projectPins: [],
        pinned: [],
        collapsed: [],
        revision: 1,
      });
      const view = renderHookWithProviders(() => useConversationProjects('alice'));
      await waitFor(() => expect(view.result.current.projects[0]?.name).toBe('Server writing'));
      expect(view.result.current.error).toBeNull();
      expect(localStorage.getItem('mastra:conversation-projects:alice')).toBe('{invalid');
    });
  });
});
