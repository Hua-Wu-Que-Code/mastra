import { SidebarProvider } from '@mastra/playground-ui/components/Sidebar';
import { MastraReactProvider } from '@mastra/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { AccountGate } from '../account-gate';
import { AccountMenu } from '../account-menu';
import { creatorSession } from './fixtures/session';
import { server } from '@/test/msw-server';

const endpoint = 'http://localhost:4111';

function renderAccount(collapsed = false) {
  return render(
    <MastraReactProvider baseUrl={endpoint}>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter>
          <SidebarProvider defaultState={collapsed ? 'collapsed' : 'default'} storageKey="account-menu-test">
            <AccountGate endpoint={endpoint} apiPrefix="/api">
              <AccountMenu />
            </AccountGate>
          </SidebarProvider>
        </MemoryRouter>
      </QueryClientProvider>
    </MastraReactProvider>,
  );
}

afterEach(cleanup);

describe('AccountMenu', () => {
  describe('when a signed in user opens the account menu', () => {
    it('offers settings and signs out through the Go session endpoint', async () => {
      server.use(
        http.get(`${endpoint}/account/session`, () => HttpResponse.json(creatorSession)),
        http.post(`${endpoint}/account/sign-out`, () => HttpResponse.json({ ok: true })),
      );
      renderAccount();
      fireEvent.click(await screen.findByRole('button', { name: 'Alice' }));
      expect(within(screen.getByRole('menu')).queryByText('Alice')).toBeNull();
      expect(within(screen.getByRole('menu')).queryByText(creatorSession.user.email)).toBeNull();
      expect(screen.getByRole('menuitem', { name: 'Settings' }).getAttribute('href')).toBe('/settings');
      fireEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }));
      expect(await screen.findByLabelText('Email')).toBeTruthy();
    });
  });

  describe('when sign out fails with the sidebar collapsed', () => {
    it('keeps the account menu accessible and lets the user retry', async () => {
      let attempts = 0;
      server.use(
        http.get(`${endpoint}/account/session`, () => HttpResponse.json(creatorSession)),
        http.post(`${endpoint}/account/sign-out`, () => {
          attempts++;
          return attempts === 1
            ? HttpResponse.json({ error: 'Please retry logout' }, { status: 503 })
            : HttpResponse.json({ ok: true });
        }),
      );
      renderAccount(true);
      const trigger = await screen.findByRole('button', { name: 'Alice' });
      fireEvent.click(trigger);
      fireEvent.click(await screen.findByRole('menuitem', { name: 'Sign out' }));
      expect((await screen.findByRole('alert')).textContent).toBe('Sign-out failed. Please retry.');
      fireEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }));
      expect(await screen.findByLabelText('Email')).toBeTruthy();
      expect(attempts).toBe(2);
    });
  });
});
