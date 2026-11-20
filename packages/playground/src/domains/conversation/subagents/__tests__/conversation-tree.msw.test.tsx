import { MastraReactProvider } from '@mastra/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { ConversationTree } from '../conversation-tree';
import { tree, childTree } from './fixtures/tree';
import { StudioConfigContext } from '@/domains/configuration/context/studio-config-state';
import { server } from '@/test/msw-server';
const baseUrl = 'http://localhost:4111';
afterEach(cleanup);

function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  server.use(http.get(`${baseUrl}/api/mcp/v0/servers`, () => HttpResponse.json({ servers: [], totalCount: 0 })));
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <StudioConfigContext.Provider value={{ baseUrl, headers: {}, isLoading: false, setConfig: () => {} }}>
          <MastraReactProvider baseUrl={baseUrl}>
            <ConversationTree root="root-one">
              <div>Root conversation</div>
            </ConversationTree>
          </MastraReactProvider>
        </StudioConfigContext.Provider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}
describe('Conversation tree', () => {
  describe('when the server has a saved child conversation', () => {
    it('opens the child with real usage and returns to the root conversation', async () => {
      server.use(
        http.get(`${baseUrl}/altflow/subagents`, ({ request }) =>
          HttpResponse.json(new URL(request.url).searchParams.has('child') ? childTree : tree),
        ),
      );
      show();
      expect(await screen.findByText('Research report')).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: '1 sub-agents' }));
      fireEvent.click(await screen.findByRole('button', { name: /Research sources/ }));
      expect(await screen.findByText('Verified sources for the report.')).toBeTruthy();
      expect(within(screen.getByRole('region', { name: 'Sub-agent conversation' })).getByText(/114K tok/)).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: 'Research report' }));
      expect(await screen.findByText('Root conversation')).toBeTruthy();
    });
    it('posts child instructions with teamwork off through the authenticated tree endpoint', async () => {
      let submitted: unknown;
      server.use(
        http.get(`${baseUrl}/altflow/subagents`, ({ request }) =>
          HttpResponse.json(new URL(request.url).searchParams.has('child') ? childTree : tree),
        ),
        http.post(`${baseUrl}/altflow/subagents`, async ({ request }) => {
          submitted = { url: request.url, body: await request.json() };
          return HttpResponse.json({ messageId: 'saved' });
        }),
      );
      show();
      fireEvent.click(await screen.findByRole('button', { name: '1 sub-agents' }));
      fireEvent.click(await screen.findByRole('button', { name: /Research sources/ }));
      fireEvent.change(await screen.findByRole('textbox', { name: 'Message sub-agent' }), {
        target: { value: 'Check the second source' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
      await waitFor(() =>
        expect(submitted).toEqual({
          url: `${baseUrl}/altflow/subagents?root=root-one&child=child-one&page=0`,
          body: { action: 'prompt', prompt: 'Check the second source' },
        }),
      );
    });
  });
  describe('when teamwork is disabled', () => {
    it('preserves the saved child transcript and allows new child instructions', async () => {
      server.use(
        http.get(`${baseUrl}/altflow/subagents`, ({ request }) =>
          HttpResponse.json(new URL(request.url).searchParams.has('child') ? childTree : tree),
        ),
      );
      show();
      fireEvent.click(await screen.findByRole('button', { name: '1 sub-agents' }));
      fireEvent.click(await screen.findByRole('button', { name: /Research sources/ }));
      expect(await screen.findByText('Verified sources for the report.')).toBeTruthy();
      expect(screen.getByRole('textbox', { name: 'Message sub-agent' }).hasAttribute('disabled')).toBe(false);
      expect(screen.getByRole('button', { name: 'Send message' }).hasAttribute('disabled')).toBe(true);
      expect(document.querySelector('[data-slot="composer-box"]')).toBeTruthy();
    });
    it('shows saved tool activity without exposing raw tool arguments or results', async () => {
      server.use(
        http.get(`${baseUrl}/altflow/subagents`, ({ request }) =>
          HttpResponse.json(
            new URL(request.url).searchParams.has('child')
              ? {
                  ...childTree,
                  messages: [
                    {
                      ...childTree.messages[0],
                      content: {
                        format: 2,
                        parts: [
                          {
                            type: 'tool-invocation',
                            toolInvocation: {
                              toolCallId: 'tool-one',
                              toolName: 'verify_source',
                              state: 'result',
                              args: { source: 'source-42' },
                              result: { verified: 'CHILD-TOOL-RESULT' },
                            },
                          },
                          { type: 'text', text: 'Verified sources for the report.' },
                        ],
                      },
                    },
                  ],
                }
              : tree,
          ),
        ),
      );
      show();
      fireEvent.click(await screen.findByRole('button', { name: '1 sub-agents' }));
      fireEvent.click(await screen.findByRole('button', { name: /Research sources/ }));
      await screen.findByText('Verified sources for the report.');
      fireEvent.click(screen.getByRole('button', { name: 'Show work details' }));
      fireEvent.click(await screen.findByRole('button', { name: 'Tools called' }));
      expect(await screen.findByText('verify_source')).toBeTruthy();
      expect(screen.queryByText(/source-42/)).toBeNull();
      expect(screen.queryByText(/CHILD-TOOL-RESULT/)).toBeNull();
    });
  });
  describe('when there are no children', () => {
    it('shows the title without an empty sub-agent menu', async () => {
      server.use(http.get(`${baseUrl}/altflow/subagents`, () => HttpResponse.json({ ...tree, children: [] })));
      show();
      await screen.findByText('Research report');
      expect(screen.queryByRole('button', { name: /sub-agents/ })).toBeNull();
    });
  });
});
