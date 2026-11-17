import type { GetAgentResponse, GetMemoryStatusResponse, ListAgentVersionsResponse } from '@mastra/client-js';
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

const memoryOn: GetMemoryStatusResponse = { result: true, memoryType: 'local' };

// Counts the version lookups so each test can prove the editor gate works: the
// footer must only hit this endpoint when the editor is actually available.
const onVersions = vi.fn<() => void>();

function registerFooterHandlers({
  agent = baseAgent,
  cmsEnabled = false,
  versions = emptyVersions,
  memory = memoryOn,
}: {
  agent?: GetAgentResponse;
  cmsEnabled?: boolean;
  versions?: ListAgentVersionsResponse;
  memory?: GetMemoryStatusResponse | 'loading';
} = {}) {
  server.use(
    http.get(`${BASE_URL}/api/agents/${AGENT_ID}`, () => HttpResponse.json(agent)),
    http.get(`${BASE_URL}/api/system/packages`, () => HttpResponse.json({ ...systemPackages, cmsEnabled })),
    http.get(`${BASE_URL}/api/stored/agents/${AGENT_ID}/versions`, () => {
      onVersions();
      return HttpResponse.json(versions);
    }),
    // 'loading' returns a never-resolving response so the memory query stays pending.
    http.get(`${BASE_URL}/api/memory/status`, () =>
      memory === 'loading' ? new Promise<Response>(() => {}) : HttpResponse.json(memory),
    ),
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
  it('keeps the editor capability off and never fetches versions when CMS is unavailable', async () => {
    registerFooterHandlers({ cmsEnabled: false });
    renderFooter();

    const footer = await screen.findByTestId('agent-capabilities-footer');
    fireEvent.click(footer);

    // Editor reads "Off" and the gated versions query stays put.
    expect(await screen.findByRole('link', { name: 'Editor: Off' })).not.toBeNull();
    // Once "Editor: Off" has rendered the gate has settled (versions query disabled), so no extra wait is needed.
    expect(onVersions).not.toHaveBeenCalled();

    expect(screen.queryByRole('link', { name: /^Memory:/ })).toBeNull();
    expect(screen.queryByRole('link', { name: /^Sub-agents:/ })).toBeNull();
  });

  it('enables the editor capability and fetches versions when CMS is available', async () => {
    registerFooterHandlers({ cmsEnabled: true, versions: { ...emptyVersions, total: 2 } });
    renderFooter();

    // The gate opens: the footer looks up versions exactly once...
    await waitFor(() => expect(onVersions).toHaveBeenCalledTimes(1));

    // ...and the editor row surfaces the version count.
    fireEvent.click(await screen.findByTestId('agent-capabilities-footer'));
    expect(await screen.findByRole('link', { name: 'Editor: 2' })).not.toBeNull();
  });

  it('marks the editor locked and skips the versions fetch when the agent disables editing', async () => {
    registerFooterHandlers({ cmsEnabled: true, agent: { ...baseAgent, editor: false } });
    renderFooter();

    fireEvent.click(await screen.findByTestId('agent-capabilities-footer'));
    expect(await screen.findByRole('link', { name: 'Editor: Locked' })).not.toBeNull();
    // The editor is locked, so the versions query stays disabled — assert directly without a timer.
    expect(onVersions).not.toHaveBeenCalled();
  });

  it('excludes sub-agent and memory capabilities after their controls move to settings', async () => {
    registerFooterHandlers({
      cmsEnabled: false,
      agent: { ...baseAgent, agents: { researcher: { id: 'researcher', name: 'Researcher' } } },
    });
    renderFooter();
    const footer = await screen.findByTestId('agent-capabilities-footer');
    await waitFor(() => expect(footer.textContent).toMatch(/0\/4/));
    fireEvent.click(footer);
    expect(screen.queryByRole('link', { name: /^Sub-agents:/ })).toBeNull();
    expect(screen.queryByRole('link', { name: /^Memory:/ })).toBeNull();
  });
});
