// @vitest-environment jsdom
import { MastraReactProvider } from '@mastra/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { ChatPreferencesProvider } from '../../preferences/chat-preferences-provider';
import { ChatMetricsProvider } from '../chat-metrics-provider';
import { ChatSessionStats } from '../chat-session-stats';
import { pendingTrace, completedTrace, streamingMessages } from './fixtures/session-stats';
import { server } from '@/test/msw-server';

const baseUrl = 'http://localhost:4111';

function setup({ streaming = false, route = 'altflow/model', capacity = 131072 } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <MastraReactProvider baseUrl={baseUrl}>
      <QueryClientProvider client={client}>
        <ChatPreferencesProvider scope="stats-test">
          <ChatMetricsProvider messages={streaming ? streamingMessages : []} running={streaming}>
            <ChatSessionStats contextWindow={capacity} route={route} />
          </ChatMetricsProvider>
        </ChatPreferencesProvider>
      </QueryClientProvider>
    </MastraReactProvider>,
  );
  return client;
}

beforeEach(() => localStorage.clear());

describe('Conversation statistics dock', () => {
  describe('when the first request has no usage yet', () => {
    it('keeps all three entries clickable without inventing zero usage', async () => {
      setup();
      expect(screen.getByRole('button', { name: 'Conversation statistics' })).toBeDefined();
      fireEvent.click(screen.getByRole('button', { name: 'Token usage' }));
      expect(await screen.findByText('Cache hit')).toBeDefined();
      expect(screen.getByText('Output tokens')).toBeDefined();
      fireEvent.click(screen.getByRole('button', { name: 'Context usage' }));
      expect(await screen.findByText('— / 131K')).toBeDefined();
      expect(screen.getByRole('progressbar').hasAttribute('aria-valuenow')).toBe(false);
      expect(screen.getByText('System prompt')).toBeDefined();
      expect(screen.getByText('Tool definitions')).toBeDefined();
      expect(screen.getByText('Conversation messages')).toBeDefined();
      expect(screen.queryByText('0%')).toBeNull();
      expect(screen.queryByText('0 tok')).toBeNull();
    });
  });

  describe('when the first streamed request later reports usage', () => {
    it('updates the open context card and token entry from real trace records', async () => {
      let response = pendingTrace;
      server.use(http.get(`${baseUrl}/api/observability/traces/run`, () => HttpResponse.json(response)));
      const client = setup({ streaming: true });
      expect(screen.getByRole('button', { name: 'Token usage' }).textContent).toContain('— tok');
      fireEvent.click(screen.getByRole('button', { name: 'Context usage' }));
      expect(await screen.findByText('— / 131K')).toBeDefined();
      await waitFor(() => expect(client.isFetching()).toBe(0));

      response = completedTrace;
      await act(async () => {
        await client.invalidateQueries();
      });
      expect(await screen.findByText('1K / 131K')).toBeDefined();
      expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe('1');
      expect(screen.getByRole('button', { name: 'Token usage' }).textContent).toContain('1.2K tok');
      expect(screen.getByRole('button', { name: 'Token usage' }).textContent).toContain('80%');
    });
  });

  describe('when the user switches to a model without a matching request sample', () => {
    it('keeps the context card available and excludes the previous model reading', async () => {
      server.use(http.get(`${baseUrl}/api/observability/traces/run`, () => HttpResponse.json(completedTrace)));
      const client = setup({ streaming: true, route: 'altflow/other-model', capacity: 0 });
      await waitFor(() => expect(client.isFetching()).toBe(0));
      expect(screen.getByRole('button', { name: 'Token usage' }).textContent).toContain('1.2K tok');
      fireEvent.click(screen.getByRole('button', { name: 'Context usage' }));
      expect(await screen.findByText('— / —')).toBeDefined();
      expect(screen.getByRole('button', { name: 'Context usage' }).textContent).toBe('—%');
      expect(screen.getByRole('progressbar').hasAttribute('aria-valuenow')).toBe(false);
    });
  });
});
