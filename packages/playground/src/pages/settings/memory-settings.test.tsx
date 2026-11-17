import type { GetMemoryConfigResponse } from '@mastra/client-js';
import { MastraReactProvider } from '@mastra/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { MemorySettingsPage } from './memory-settings';
import { v2Agent } from '@/domains/agents/components/__tests__/fixtures/composer-model-settings';
import { server } from '@/test/msw-server';
import { TestLinkProvider } from '@/test/link-provider';
import { resolveMemoryOptions } from '@/domains/agents/context/agent-memory-preferences';

const base = 'http://localhost:4111';
const config: GetMemoryConfigResponse = {
  config: { lastMessages: 20, workingMemory: { enabled: true }, observationalMemory: { enabled: true } },
};
function renderSettings(hasConversation = false, memoryConfig = config) {
  server.use(
    http.get(`${base}/api/agents`, () => HttpResponse.json({ chef: { ...v2Agent, id: 'chef', name: 'Chef' } })),
    http.get(`${base}/api/memory/config`, () => HttpResponse.json(memoryConfig)),
    http.get(`${base}/api/memory/status`, () => HttpResponse.json({ result: true })),
    http.get(`${base}/api/memory/threads/:threadId`, () =>
      HttpResponse.json({
        id: 'stored-thread',
        resourceId: 'actual-owner',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ),
    http.get(`${base}/api/memory/threads/:threadId/working-memory`, () =>
      HttpResponse.json({ workingMemory: '# Stored author notes', source: 'resource' }),
    ),
    http.get(`${base}/api/memory/threads`, () =>
      HttpResponse.json({
        threads: hasConversation
          ? [
              {
                id: 'stored-thread',
                title: 'Saved conversation',
                resourceId: 'actual-owner',
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ]
          : [],
      }),
    ),
  );
  render(
    <MastraReactProvider baseUrl={base}>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={['/settings/memory']}>
          <TestLinkProvider>
            <MemorySettingsPage />
          </TestLinkProvider>
        </MemoryRouter>
      </QueryClientProvider>
    </MastraReactProvider>,
  );
}
afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('MemorySettingsPage', () => {
  it('keeps observations unavailable when the server has no observation engine', async () => {
    renderSettings(false, { config: { ...config.config, observationalMemory: { enabled: false } } });
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Memory' })).toHaveProperty('disabled', false));
    expect(screen.getByRole('switch', { name: 'Observational Memory' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('switch', { name: 'Observational Memory' }).getAttribute('aria-checked')).toBe('false');
  });
  it('uses server compaction policy in Auto and sends explicit history limits', () => {
    expect(resolveMemoryOptions({ lastMessages: 'auto' })).toBeUndefined();
    expect(resolveMemoryOptions({ lastMessages: 12 })).toEqual({ lastMessages: 12 });
    expect(resolveMemoryOptions({ lastMessages: 0 })).toEqual({ lastMessages: false });
  });
  describe('when a conversation already has working memory', () => {
    it('loads its notes after memory status resolves', async () => {
      renderSettings(true);
      expect(await screen.findByText('Stored author notes')).not.toBeNull();
      expect(screen.getByRole('combobox', { name: 'Conversation' }).textContent).toContain('Saved conversation');
    });
  });
  describe('when memory preferences are changed', () => {
    it('restores the memory switch after reopening settings', async () => {
      renderSettings();
      await waitFor(() => expect(screen.getByRole('switch', { name: 'Memory' })).toHaveProperty('disabled', false));
      fireEvent.click(screen.getByRole('switch', { name: 'Memory' }));
      await waitFor(() =>
        expect(screen.getByRole('switch', { name: 'Memory' }).getAttribute('aria-checked')).toBe('false'),
      );
      cleanup();
      renderSettings();
      expect((await screen.findByRole('switch', { name: 'Memory' })).getAttribute('aria-checked')).toBe('false');
    });
    it('persists the recent message limit independently of the memory switches', async () => {
      renderSettings();
      await screen.findByRole('switch', { name: 'Memory' });
      await screen.findByRole('spinbutton', { name: 'Recent message limit' });
      await waitFor(() =>
        expect(screen.getByRole('spinbutton', { name: 'Recent message limit' })).toHaveProperty('disabled', false),
      );
      fireEvent.change(screen.getByRole('spinbutton', { name: 'Recent message limit' }), {
        target: { value: '12' },
      });
      cleanup();
      renderSettings();
      expect(await screen.findByRole('spinbutton', { name: 'Recent message limit' })).toHaveProperty('value', '12');
    });
  });
});
