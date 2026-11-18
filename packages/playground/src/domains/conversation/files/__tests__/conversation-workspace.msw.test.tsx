import { MemoryRouter } from 'react-router';
import { ChatMessagesContext } from '@mastra/playground-ui/domains/chat/context/chat-context';
import { MastraReactProvider } from '@mastra/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';
import { ConversationWorkspace } from '../conversation-workspace';
import { fileMessages, filesFixture } from './fixtures/files';
import { StudioConfigContext } from '@/domains/configuration/context/studio-config-state';
import { server } from '@/test/msw-server';

const baseUrl = 'http://localhost:4111';
afterEach(() => {
  cleanup();
  localStorage.clear();
});

function show(scope = 'thread-a') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const workspace = (nextScope: string) => (
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <StudioConfigContext.Provider value={{ baseUrl, headers: {}, isLoading: false, setConfig: () => {} }}>
          <MastraReactProvider baseUrl={baseUrl}>
            <ChatMessagesContext.Provider
              value={{
                messages:
                  nextScope === 'new'
                    ? []
                    : nextScope === 'thread-b'
                      ? fileMessages.slice(0, 1)
                      : fileMessages.slice(0, 2),
              }}
            >
              <ConversationWorkspace key={nextScope} scope={nextScope} agentId="creator-agent">
                <a href={`${baseUrl}/storage/download?path=${encodeURIComponent('/outputs/draft.md')}`}>
                  Download draft
                </a>
                <div>Chat content</div>
              </ConversationWorkspace>
            </ChatMessagesContext.Provider>
          </MastraReactProvider>
        </StudioConfigContext.Provider>
      </QueryClientProvider>
    </MemoryRouter>
  );
  return { ...render(workspace(scope)), workspace };
}
function handlers() {
  server.use(
    http.get(`${baseUrl}/storage`, () => HttpResponse.json(filesFixture)),
    http.get(
      `${baseUrl}/storage/download`,
      () => new HttpResponse('# Generated draft', { headers: { 'Content-Type': 'text/markdown' } }),
    ),
  );
}

describe('Conversation workspace', () => {
  it('shows files for both a new chat and a saved conversation', async () => {
    handlers();
    const view = show('new');
    expect(await screen.findByRole('complementary', { name: 'Files and artifacts' })).toBeTruthy();
    expect(await screen.findByText('No files found.')).toBeTruthy();
    view.rerender(view.workspace('saved'));
    expect(await screen.findByRole('button', { name: 'draft.md' })).toBeTruthy();
    expect(screen.getByText('Chat content')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Files and artifacts' })).toHaveLength(1);
  });

  it('opens an assistant file link in the panel and preserves chat content', async () => {
    handlers();
    show();
    await screen.findByRole('button', { name: 'draft.md' });
    fireEvent.click(screen.getByRole('button', { name: 'Files and artifacts' }));
    expect(screen.queryByRole('complementary')).toBeNull();
    const allowedNavigation = fireEvent.click(screen.getByRole('link', { name: 'Download draft' }));
    expect(allowedNavigation).toBe(false);
    expect(await screen.findByRole('heading', { name: 'Generated draft' })).toBeTruthy();
    expect(screen.getByText('Chat content')).toBeTruthy();
  });

  it('restores each conversation panel separately across navigation', async () => {
    handlers();
    const view = show();
    fireEvent.click(await screen.findByRole('button', { name: 'draft.md' }));
    await screen.findByRole('heading', { name: 'Generated draft' });
    view.rerender(view.workspace('thread-b'));
    expect(await screen.findByRole('button', { name: 'notes.txt' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Generated draft' })).toBeNull();
    view.rerender(view.workspace('thread-a'));
    expect(await screen.findByRole('heading', { name: 'Generated draft' })).toBeTruthy();
  });
});
