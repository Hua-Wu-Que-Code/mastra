import { ThemeProvider } from '@mastra/playground-ui/components/ThemeProvider';

import { locale, LOCALE_STORAGE_KEY } from '@mastra/playground-ui/lib/i18n';
import { MastraReactProvider } from '@mastra/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { StudioSettingsPage } from './index';
import { Layout } from '@/components/layout';
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
        <MastraReactProvider baseUrl={BASE_URL}>
          <MemoryRouter
            initialEntries={[{ pathname: '/settings', state: { returnTo: '/agents/creator/chat?thread=one' } }]}
          >
            <ThemeProvider>
              <Layout>
                <StudioSettingsPage />
              </Layout>
            </ThemeProvider>
          </MemoryRouter>
        </MastraReactProvider>
      </StudioConfigProvider>
    </QueryClientProvider>,
  );

  await waitFor(() =>
    expect(screen.getByRole('textbox', { name: 'Altflow instance URL' })).toHaveProperty('value', BASE_URL),
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
  describe('when editor preferences are changed', () => {
    it('restores input mode, context visibility, shortcut and follow-up behavior', async () => {
      await renderSettingsPage();
      const editor = within(screen.getByRole('region', { name: 'Editor', exact: true }));
      fireEvent.click(editor.getByRole('switch', { name: 'Plain text editor' }));
      fireEvent.click(editor.getByRole('switch', { name: 'Show context window usage' }));
      fireEvent.click(editor.getByRole('combobox', { name: 'Send shortcut' }));
      const option = await screen.findByRole('option', { name: 'Cmd/Ctrl+Enter', exact: true });
      fireEvent.pointerDown(option, { pointerType: 'mouse' });
      fireEvent.click(option, { detail: 1 });
      fireEvent.click(editor.getByRole('button', { name: 'Steer', exact: true }));
      cleanup();
      await renderSettingsPage();
      expect(screen.getByRole('switch', { name: 'Plain text editor' }).getAttribute('aria-checked')).toBe('false');
      expect(screen.getByRole('switch', { name: 'Show context window usage' }).getAttribute('aria-checked')).toBe(
        'false',
      );
      expect(screen.getByRole('combobox', { name: 'Send shortcut' }).textContent).toContain('Cmd/Ctrl+Enter');
      expect(screen.getByRole('button', { name: 'Steer', exact: true }).getAttribute('aria-pressed')).toBe('true');
    });
  });
  describe('when conversation display preferences are changed', () => {
    it('restores the choices after reopening settings', async () => {
      await renderSettingsPage();
      fireEvent.change(screen.getByRole('spinbutton', { name: 'Font size' }), { target: { value: '18' } });
      fireEvent.click(screen.getByRole('combobox', { name: 'Work details' }));
      const compact = await screen.findByRole('option', { name: 'Compact' });
      fireEvent.pointerDown(compact, { pointerType: 'mouse' });
      fireEvent.click(compact, { detail: 1 });
      fireEvent.click(screen.getByRole('combobox', { name: 'Collapse work details' }));
      const nextMessage = await screen.findByRole('option', { name: 'On next message' });
      fireEvent.pointerDown(nextMessage, { pointerType: 'mouse' });
      fireEvent.click(nextMessage, { detail: 1 });
      fireEvent.click(screen.getByRole('combobox', { name: 'Replies when collapsed' }));
      const finalOnly = await screen.findByRole('option', { name: 'Final answer only' });
      fireEvent.pointerDown(finalOnly, { pointerType: 'mouse' });
      fireEvent.click(finalOnly, { detail: 1 });
      await waitFor(() =>
        expect(screen.getByRole('combobox', { name: 'Replies when collapsed' }).textContent).toContain(
          'Final answer only',
        ),
      );
      cleanup();
      await renderSettingsPage();
      expect(screen.getByRole('spinbutton', { name: 'Font size' })).toHaveProperty('value', '18');
      expect(screen.getByRole('combobox', { name: 'Work details' }).textContent).toContain('Compact');
      expect(screen.getByRole('combobox', { name: 'Collapse work details' }).textContent).toContain('On next message');
      expect(screen.getByRole('combobox', { name: 'Replies when collapsed' }).textContent).toContain(
        'Final answer only',
      );
    });

    it('hides folding controls in fully expanded mode', async () => {
      await renderSettingsPage();
      fireEvent.click(screen.getByRole('combobox', { name: 'Work details' }));
      const expanded = await screen.findByRole('option', { name: 'Fully expanded' });
      fireEvent.pointerDown(expanded, { pointerType: 'mouse' });
      fireEvent.click(expanded, { detail: 1 });
      await waitFor(() => expect(screen.queryByRole('combobox', { name: 'Replies when collapsed' })).toBeNull());
    });
  });

  describe('when the settings page is visited', () => {
    it('provides separate settings navigation and a return link to the original conversation', async () => {
      await renderSettingsPage();

      expect(screen.getByRole('link', { name: 'Back to app' }).getAttribute('href')).toBe(
        '/agents/creator/chat?thread=one',
      );
      expect(screen.queryByRole('navigation', { name: 'Main' })).toBeNull();
      fireEvent.change(screen.getByRole('textbox', { name: 'API prefix' }), { target: { value: '/unsaved-api' } });
      expect(screen.queryByRole('link', { name: 'Appearance' })).toBeNull();
      expect(screen.getByRole('group', { name: 'Appearance' })).toBeDefined();
      expect(screen.getByRole('textbox', { name: 'API prefix' })).toHaveProperty('value', '/unsaved-api');
      expect(screen.getByRole('link', { name: 'Back to app' }).getAttribute('href')).toBe(
        '/agents/creator/chat?thread=one',
      );
    });

    it('shows the settings title and controls inside the main landmark', async () => {
      await renderSettingsPage();

      expect(screen.getByRole('heading', { level: 1, name: 'General' })).toBeDefined();
      const main = within(screen.getByRole('main'));
      expect(main.getByRole('textbox', { name: 'Altflow instance URL' })).toHaveProperty('value', BASE_URL);
      expect(main.getByRole('textbox', { name: 'API prefix' })).toHaveProperty('value', '/api');
      expect(main.getByRole('button', { name: 'Follow system' }).getAttribute('aria-pressed')).toBe('true');
    });
  });

  describe('when appearance is changed in general settings', () => {
    it('applies the selected theme and restores it after reopening settings', async () => {
      await renderSettingsPage();
      fireEvent.click(screen.getByRole('button', { name: 'Dark', exact: true }));
      expect(localStorage.getItem('mastra-theme')).toBe('dark');
      expect(screen.getByRole('button', { name: 'Dark', exact: true }).getAttribute('aria-pressed')).toBe('true');
      cleanup();
      await renderSettingsPage();
      expect(screen.getByRole('button', { name: 'Dark', exact: true }).getAttribute('aria-pressed')).toBe('true');
      fireEvent.click(screen.getByRole('button', { name: 'Light', exact: true }));
      expect(localStorage.getItem('mastra-theme')).toBe('light');
      fireEvent.click(screen.getByRole('button', { name: 'Follow system' }));
      expect(localStorage.getItem('mastra-theme')).toBe('system');
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

describe('Altflow language settings', () => {
  describe('when Chinese is selected with unsaved connection edits', () => {
    it('translates the page and preserves those edits', async () => {
      await renderSettingsPage();
      const prefix = screen.getByRole('textbox', { name: 'API prefix' });
      fireEvent.change(prefix, { target: { value: '/unsaved-api' } });
      fireEvent.click(screen.getByRole('combobox', { name: 'Language' }));
      const chinese = await screen.findByRole('option', { name: '中文' });
      fireEvent.pointerDown(chinese, { pointerType: 'mouse' });
      fireEvent.click(chinese, { detail: 1 });
      expect(screen.getByRole('heading', { level: 1, name: '通用' })).toBeDefined();
      expect(prefix).toHaveProperty('value', '/unsaved-api');
      expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('zh');
    });
  });
});
