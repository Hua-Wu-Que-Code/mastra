import { ThemeProvider } from '@mastra/playground-ui/components/ThemeProvider';

import { locale, LOCALE_STORAGE_KEY } from '@mastra/playground-ui/lib/i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { StudioSettingsPage } from './index';
import { authDisabledCapabilities } from '@/domains/configuration/context/__tests__/fixtures/capabilities';
import {
  MASTRA_STUDIO_CONFIG_LOCAL_STORAGE_KEY,
  StudioConfigProvider,
} from '@/domains/configuration/context/studio-config-context';
import { server } from '@/test/msw-server';

const BASE_URL = 'http://localhost:4111';

async function renderSettingsPage() {
  server.use(http.get(`${BASE_URL}/api/auth/capabilities`, () => HttpResponse.json(authDisabledCapabilities)));
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <QueryClientProvider client={queryClient}>
      <StudioConfigProvider endpoint={BASE_URL}>
        <ThemeProvider>
          <StudioSettingsPage />
        </ThemeProvider>
      </StudioConfigProvider>
    </QueryClientProvider>,
  );

  await waitFor(() =>
    expect(screen.getByRole('textbox', { name: 'Mastra instance URL' })).toHaveProperty('value', BASE_URL),
  );
}

beforeAll(() => {
  if (window.PointerEvent === undefined) {
    Object.defineProperty(window, 'PointerEvent', { value: window.MouseEvent, configurable: true });
  }
});

afterEach(() => {
  cleanup();
  act(() => locale.setLocale('en'));
  localStorage.clear();
});

describe('StudioSettingsPage', () => {
  describe('when the settings page is visited', () => {
    it('shows the settings title and controls inside the main landmark', async () => {
      await renderSettingsPage();

      expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeDefined();
      const main = within(screen.getByRole('main'));
      expect(
        within(main.getByRole('radiogroup', { name: 'Theme' }))
          .getByRole('radio', { name: 'System' })
          .getAttribute('aria-checked'),
      ).toBe('true');
      expect(main.getByRole('textbox', { name: 'Mastra instance URL' })).toHaveProperty('value', BASE_URL);
      expect(main.getByRole('textbox', { name: 'API prefix' })).toHaveProperty('value', '/api');
    });
  });

  describe('when the connection settings are edited', () => {
    it('persists the configuration submitted from the page', async () => {
      await renderSettingsPage();

      fireEvent.change(screen.getByRole('textbox', { name: 'API prefix' }), { target: { value: '/custom-api' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

      expect(JSON.parse(localStorage.getItem(MASTRA_STUDIO_CONFIG_LOCAL_STORAGE_KEY) ?? '{}')).toMatchObject({
        baseUrl: BASE_URL,
        apiPrefix: '/custom-api',
        headers: {},
      });
    });
  });
});

describe('Studio language settings', () => {
  describe('when Chinese is selected with unsaved connection edits', () => {
    it('translates the page and preserves those edits', async () => {
      await renderSettingsPage();
      const prefix = screen.getByRole('textbox', { name: 'API prefix' });
      fireEvent.change(prefix, { target: { value: '/unsaved-api' } });
      fireEvent.click(screen.getByRole('combobox', { name: 'Language' }));
      const chinese = await screen.findByRole('option', { name: '中文' });
      fireEvent.pointerDown(chinese, { pointerType: 'mouse' });
      fireEvent.click(chinese, { detail: 1 });
      expect(screen.getByRole('heading', { level: 1, name: '设置' })).toBeDefined();
      expect(prefix).toHaveProperty('value', '/unsaved-api');
      expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('zh');
    });
  });
});
