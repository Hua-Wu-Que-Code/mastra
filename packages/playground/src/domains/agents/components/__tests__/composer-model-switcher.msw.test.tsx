// @vitest-environment jsdom
import type { ListAgentsModelProvidersResponse } from '@mastra/client-js';
import { TooltipProvider } from '@mastra/playground-ui/components/Tooltip';
import { MastraReactProvider } from '@mastra/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';

import { useAgentSettings } from '../../context/agent-context';
import { ThreadPreferencesProvider } from '../../context/thread-preferences-provider';
import { ComposerModelSwitcher } from '../composer-model-switcher';
import { threadPreferenceHandlers } from './fixtures/thread-preferences';
import { gatewayProviders, openAiProviders } from './fixtures/composer-model-switcher';
import { server } from '@/test/msw-server';

const BASE_URL = 'http://localhost:4111';

const createGate = () => {
  let release = () => {};
  const promise = new Promise<void>(resolve => {
    release = resolve;
  });

  return { promise, release };
};

const mockProviderRequests = (
  providersGate: Promise<void>,
  providers: ListAgentsModelProvidersResponse = { providers: [] },
) => {
  server.use(
    ...threadPreferenceHandlers(BASE_URL),
    http.get(`${BASE_URL}/api/agents/providers`, async () => {
      await providersGate;
      return HttpResponse.json(providers);
    }),
    http.get(`${BASE_URL}/api/auth/capabilities`, () => HttpResponse.json({ enabled: false, login: null })),
    http.get(`${BASE_URL}/api/editor/builder/settings`, () =>
      HttpResponse.json({ enabled: false, modelPolicy: { active: false } }),
    ),
    http.get(`${BASE_URL}/api/editor/builder/models/available`, () => HttpResponse.json({ providers: [] })),
  );
};

function SettingsProbe() {
  const { settings } = useAgentSettings();
  return <output data-testid="settings">{JSON.stringify(settings)}</output>;
}

const renderSwitcher = (agentModel?: { provider: string; model: string }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <MastraReactProvider baseUrl={BASE_URL}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <TooltipProvider>
            <ThreadPreferencesProvider
              agentId="test-agent"
              threadId="test-thread"
              defaultProvider={agentModel?.provider ?? ''}
              defaultModel={agentModel?.model ?? ''}
            >
              <ComposerModelSwitcher />
              <SettingsProbe />
            </ThreadPreferencesProvider>
          </TooltipProvider>
        </MemoryRouter>
      </QueryClientProvider>
    </MastraReactProvider>,
  );
};

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('ComposerModelSwitcher', () => {
  describe('when agent teamwork is enabled', () => {
    it('restores the team selection after reopening the conversation', async () => {
      mockProviderRequests(Promise.resolve(), openAiProviders);
      renderSwitcher({ provider: 'openai', model: 'gpt-4o-mini' });
      fireEvent.click(await screen.findByRole('button', { name: /Model:.*GPT-4o Mini/ }));
      fireEvent.click(screen.getByRole('button', { name: /Agent teamwork/ }));
      expect(
        screen.getByText(
          'Enable shared tasks and coordination instructions. Sub-agents remain available when disabled.',
        ),
      ).not.toBeNull();
      fireEvent.click(screen.getByRole('switch', { name: 'Enable agent teamwork' }));
      await waitFor(() => expect(screen.getByTestId('settings').textContent).toContain('"teamwork":true'));
      cleanup();
      renderSwitcher({ provider: 'openai', model: 'gpt-4o-mini' });
      await waitFor(() => expect(screen.getByTestId('settings').textContent).toContain('"teamwork":true'));
    });
  });

  describe('when the providers request is still in flight', () => {
    it('reserves the picker footprint with a skeleton until providers resolve', async () => {
      const providersGate = createGate();
      mockProviderRequests(providersGate.promise);
      renderSwitcher();

      expect(await screen.findByTestId('composer-model-switcher-skeleton')).not.toBeNull();
      expect(screen.queryByText('Select model')).toBeNull();

      providersGate.release();

      await waitFor(() => expect(screen.getByText('Select model')).not.toBeNull());
      expect(screen.queryByTestId('composer-model-switcher-skeleton')).toBeNull();
    });
  });

  describe('when the agent runs on a model from the catalog', () => {
    const openPicker = async () => {
      mockProviderRequests(Promise.resolve(), openAiProviders);
      renderSwitcher({ provider: 'openai', model: 'gpt-4o-mini' });
      fireEvent.click(await screen.findByRole('button', { name: /Model:.*GPT-4o Mini/ }));
      fireEvent.click(await screen.findByRole('button', { name: /^Model (?!settings)/ }));
      return screen.findByRole('listbox');
    };

    it("marks the agent's model as the default", async () => {
      const list = await openPicker();

      const option = within(list).getByRole('option', { name: /GPT-4o Mini/ });
      expect(within(option).getByText('Default')).not.toBeNull();
    });

    it("offers no reset while the agent's model is picked", async () => {
      await openPicker();

      expect(screen.queryByRole('option', { name: /Reset to the agent's model/ })).toBeNull();
    });

    it("resets to the agent's model after another one is picked", async () => {
      const list = await openPicker();
      fireEvent.click(within(list).getByRole('option', { name: /GPT-5/ }));
      await screen.findByRole('button', { name: /Model:.*GPT-5/ });

      fireEvent.click(screen.getByRole('button', { name: /Model:.*GPT-5/ }));
      fireEvent.click(await screen.findByRole('button', { name: /^Model (?!settings)/ }));
      fireEvent.click(await screen.findByRole('option', { name: /Reset to the agent's model/ }));

      expect(await screen.findByRole('button', { name: /Model:.*GPT-4o Mini/ })).not.toBeNull();
    });
  });
  describe('when the agent runs on a gateway provider stored without its gateway prefix', () => {
    const openPicker = async () => {
      mockProviderRequests(Promise.resolve(), gatewayProviders);
      renderSwitcher({ provider: 'custom', model: 'custom-small' });
      fireEvent.click(await screen.findByRole('button', { name: /Model:.*Custom Small/ }));
      fireEvent.click(await screen.findByRole('button', { name: /^Model (?!settings)/ }));
      return screen.findByRole('listbox');
    };

    it("marks the agent's model as the default", async () => {
      const list = await openPicker();

      const option = within(list).getByRole('option', { name: /Custom Small/ });
      expect(within(option).getByText('Default')).not.toBeNull();
    });

    it("resets to the agent's model after another one is picked", async () => {
      const list = await openPicker();
      fireEvent.click(within(list).getByRole('option', { name: /Custom Large/ }));
      await screen.findByRole('button', { name: /Model:.*Custom Large/ });

      fireEvent.click(screen.getByRole('button', { name: /Model:.*Custom Large/ }));
      fireEvent.click(await screen.findByRole('button', { name: /^Model (?!settings)/ }));
      fireEvent.click(await screen.findByRole('option', { name: /Reset to the agent's model/ }));

      expect(await screen.findByRole('button', { name: /Model:.*Custom Small/ })).not.toBeNull();
    });
  });
});

describe('when the ModelHub catalog defines reasoning levels', () => {
  it('uses catalog names without logos and persists the selected effort, resetting it when changing models', async () => {
    mockProviderRequests(Promise.resolve(), {
      providers: [
        {
          id: 'altflow',
          name: 'ModelHub',
          connected: true,
          envVar: 'TEST_KEY',
          models: ['seed-turbo', 'deepseek'],
          modelNames: { 'seed-turbo': '豆包 Seed 2.1 Turbo', deepseek: 'DeepSeek V4 Pro' },
          modelReasoning: {
            'seed-turbo': { defaultLevel: 'off', levels: ['off', 'low', 'medium', 'high'] },
            deepseek: { defaultLevel: 'high', levels: ['high'] },
          },
        },
      ],
    });
    renderSwitcher({ provider: 'altflow', model: 'seed-turbo' });
    const trigger = await screen.findByRole('button', { name: /Model:.*豆包 Seed 2.1 Turbo/ });
    expect(trigger.querySelector('img')).toBeNull();
    fireEvent.click(trigger);
    fireEvent.click(await screen.findByRole('button', { name: /Reasoning level/ }));
    fireEvent.click(await screen.findByRole('option', { name: 'High' }));
    await waitFor(() =>
      expect(JSON.parse(screen.getByTestId('settings').textContent ?? '{}').modelSettings.providerOptions).toEqual({
        altflow: { reasoningLevel: 'high' },
      }),
    );
    cleanup();
    renderSwitcher({ provider: 'altflow', model: 'seed-turbo' });
    await waitFor(() => expect(screen.getByTestId('settings').textContent).toContain('\"reasoningLevel\":\"high\"'));
    fireEvent.click(screen.getByRole('button', { name: /Model:.*豆包 Seed 2.1 Turbo/ }));
    fireEvent.click(await screen.findByRole('button', { name: /^Model (?!settings)/ }));
    fireEvent.change(await screen.findByRole('combobox'), { target: { value: 'DeepSeek' } });
    const option = await screen.findByRole('option', { name: /DeepSeek V4 Pro/ });
    expect(option.querySelector('img')).toBeNull();
    fireEvent.click(option);
    fireEvent.click(await screen.findByRole('button', { name: /Model:.*DeepSeek V4 Pro/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Reasoning level/ }));
    expect(screen.queryByRole('option', { name: 'Off' })).toBeNull();
    expect(screen.getByRole('option', { name: 'High' }).getAttribute('aria-selected')).toBe('true');
  });
});
