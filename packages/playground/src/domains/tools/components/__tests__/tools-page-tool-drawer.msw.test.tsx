import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { ToolDrawer } from '../tool-drawer/tool-drawer';
import { ToolsPageDrawerBody } from '../tool-drawer/tools-page-tool-drawer-body';
import { refundUserTool } from './fixtures/refund-tool';
import { agentsWithRefundUser } from './fixtures/tool-agents';
import { authDisabled } from '@/domains/mcps/components/__tests__/fixtures/mcp-servers';
import { TestLinkProvider } from '@/test/link-provider';
import { server } from '@/test/msw-server';
import { renderWithProviders, TEST_BASE_URL, waitForMutationsIdle } from '@/test/render';

const renderDrawer = (toolId: string) =>
  renderWithProviders(
    <TestLinkProvider>
      <ToolDrawer>
        <ToolsPageDrawerBody />
      </ToolDrawer>
    </TestLinkProvider>,
    { router: { initialEntries: [`/tools?tool=${toolId}`] } },
  );

const useBaseHandlers = () => {
  server.use(
    http.get(`${TEST_BASE_URL}/altflow/tools/catalog`, () => HttpResponse.json({ entries: [] })),
    http.get(`${TEST_BASE_URL}/api/auth/capabilities`, () => HttpResponse.json(authDisabled)),
    http.get(`${TEST_BASE_URL}/api/agents`, () => HttpResponse.json(agentsWithRefundUser)),
    http.get(`${TEST_BASE_URL}/api/tools/refundUser`, () => HttpResponse.json(refundUserTool)),
  );
};

describe('Tools page tool drawer', () => {
  describe('when the URL names a tool', () => {
    it('opens on its overview: input and output fields, and the agents that use it', async () => {
      useBaseHandlers();
      renderDrawer('refundUser');

      expect(await screen.findByText('Refund a user a dollar amount.')).not.toBeNull();
      expect(screen.getByText('amount')).not.toBeNull();
      expect(screen.getByText('newBalance')).not.toBeNull();
      expect(await screen.findByText('Billing Agent')).not.toBeNull();
    });

    it('runs the tool from the Playground tab', async () => {
      useBaseHandlers();
      const onExecute = vi.fn<(body: unknown) => void>();
      server.use(
        http.post(`${TEST_BASE_URL}/api/tools/refundUser/execute`, async ({ request }) => {
          onExecute(await request.json());
          return HttpResponse.json({ refundId: 'refund_1', newBalance: 25 });
        }),
      );
      const { queryClient } = renderDrawer('refundUser');

      fireEvent.click(await screen.findByRole('tab', { name: 'Playground' }));
      fireEvent.change(await screen.findByLabelText(/user to refund/i), { target: { value: 'YJ' } });
      fireEvent.change(screen.getByLabelText(/refund amount/i), { target: { value: '25' } });
      fireEvent.click(screen.getByRole('button', { name: 'Run' }));

      expect(await screen.findByText('Success')).not.toBeNull();
      await waitFor(() => expect(onExecute).toHaveBeenCalledTimes(1));
      expect(document.body.textContent).toMatch(/"newBalance":\s*25/);
      await waitForMutationsIdle(queryClient);
    });
  });

  describe('when a tool requires conversation context', () => {
    it('shows its description and schema without fetching or executing the unscoped tool API', async () => {
      useBaseHandlers();
      server.use(
        http.get(`${TEST_BASE_URL}/altflow/tools/catalog`, () =>
          HttpResponse.json({
            entries: [
              {
                id: 'ask_user',
                name: 'ask_user',
                description: 'Ask the user a question.',
                source: 'Altflow',
                status: 'available',
                agents: ['creator-agent'],
                runtime: true,
                inputSchema: {
                  type: 'object',
                  properties: { question: { type: 'string', description: 'Question text' } },
                  required: ['question'],
                },
              },
            ],
          }),
        ),
      );
      renderDrawer('ask_user');
      expect(await screen.findByText('Ask the user a question.')).toBeTruthy();
      expect(screen.getByText('question')).toBeTruthy();
      expect(screen.getByRole('tab', { name: 'Playground' }).getAttribute('aria-disabled')).toBe('true');
    });
  });

  describe('when the tool does not exist', () => {
    it('says so instead of an empty drawer', async () => {
      useBaseHandlers();
      server.use(
        http.get(`${TEST_BASE_URL}/api/tools/missing`, () =>
          HttpResponse.json({ error: 'Not found' }, { status: 404 }),
        ),
      );
      renderDrawer('missing');

      expect(await screen.findByText('Tool "missing" not found.')).not.toBeNull();
    });
  });
});
