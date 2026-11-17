import type { GetAgentResponse, ListAgentVersionsResponse } from '@mastra/client-js';
import { MastraReactProvider } from '@mastra/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { systemPackages } from '../../__tests__/fixtures/channels';
import { v2Agent } from '../../__tests__/fixtures/composer-model-settings';
import { AgentCapabilitiesFooter } from '../agent-capabilities-footer';
import { server } from '@/test/msw-server';

const BASE_URL = 'http://localhost:4111';
const AGENT_ID = 'chef-agent';

const baseAgent: GetAgentResponse = {
  ...v2Agent,
  id: AGENT_ID,
  name: 'Chef Agent',
};

const emptyVersions: ListAgentVersionsResponse = {
  versions: [],
  total: 0,
  page: 1,
  perPage: 50,
  hasMore: false,
};

// Settings own editor controls; the capability footer should not query versions.
const onVersions = vi.fn<() => void>();

function registerFooterHandlers({
  agent = baseAgent,
  cmsEnabled = false,
  versions = emptyVersions,
}: {
  agent?: GetAgentResponse;
  cmsEnabled?: boolean;
  versions?: ListAgentVersionsResponse;
} = {}) {
  server.use(
    http.get(`${BASE_URL}/api/agents/${AGENT_ID}`, () => HttpResponse.json(agent)),
    http.get(`${BASE_URL}/api/system/packages`, () => HttpResponse.json({ ...systemPackages, cmsEnabled })),
    http.get(`${BASE_URL}/api/stored/agents/${AGENT_ID}/versions`, () => {
      onVersions();
      return HttpResponse.json(versions);
    }),
  );
}

function renderFooter() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <MastraReactProvider baseUrl={BASE_URL}>
      <QueryClientProvider client={queryClient}>
        <AgentCapabilitiesFooter agentId={AGENT_ID} />
      </QueryClientProvider>
    </MastraReactProvider>,
  );
}

afterEach(() => {
  cleanup();
  onVersions.mockClear();
});

describe('AgentCapabilitiesFooter', () => {
  describe('when editor and memory controls live in settings', () => {
    it('shows remaining capabilities without version lookups or moved status cards', async () => {
      registerFooterHandlers({ cmsEnabled: true });
      renderFooter();
      const footer = await screen.findByTestId('agent-capabilities-footer');
      await waitFor(() => expect(footer.textContent).toMatch(/0\/3/));
      fireEvent.click(footer);
      expect(await screen.findByRole('link', { name: 'Tools: Off' })).not.toBeNull();
      expect(screen.queryByRole('link', { name: /^Editor:/ })).toBeNull();
      expect(screen.queryByRole('link', { name: /^Memory:/ })).toBeNull();
      expect(screen.queryByRole('link', { name: /^Sub-agents:/ })).toBeNull();
      expect(onVersions).not.toHaveBeenCalled();
    });
    it('counts the configured tools, workflows and processors', async () => {
      registerFooterHandlers({
        agent: {
          ...baseAgent,
          tools: {
            lookup: { id: 'lookup', description: 'Look up a document.', inputSchema: '{}', outputSchema: '{}' },
          },
        },
      });
      renderFooter();
      const footer = await screen.findByTestId('agent-capabilities-footer');
      await waitFor(() => expect(footer.textContent).toMatch(/1\/3/));
      fireEvent.click(footer);
      expect(await screen.findByRole('link', { name: 'Tools: 1' })).not.toBeNull();
    });
  });
});
