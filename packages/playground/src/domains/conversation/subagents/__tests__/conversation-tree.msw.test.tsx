import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <StudioConfigContext.Provider value={{ baseUrl, headers: {}, isLoading: false, setConfig: () => {} }}>
          <ConversationTree root="root-one">
            <div>Root conversation</div>
          </ConversationTree>
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
      expect(screen.getByText(/114K tok/)).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: 'Research report' }));
      expect(await screen.findByText('Root conversation')).toBeTruthy();
    });
    it('posts child instructions through the authenticated tree endpoint', async () => {
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
  describe('when there are no children', () => {
    it('shows the title without an empty sub-agent menu', async () => {
      server.use(http.get(`${baseUrl}/altflow/subagents`, () => HttpResponse.json({ ...tree, children: [] })));
      show();
      await screen.findByText('Research report');
      expect(screen.queryByRole('button', { name: /sub-agents/ })).toBeNull();
    });
  });
});
