import { MastraReactProvider } from '@mastra/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';
import { accountQueryKey } from '../account-api';
import { useAccountSignOut } from '../account-context';
import { AccountGate } from '../account-gate';
import { adminSession, creatorSession } from './fixtures/session';
import { server } from '@/test/msw-server';

const endpoint = 'http://localhost:4111';
function Logout() {
  const logout = useAccountSignOut();
  return <button onClick={() => void logout?.()}>退出测试</button>;
}
function renderGate() {
  return render(
    <MastraReactProvider baseUrl={endpoint}>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <AccountGate endpoint={endpoint} apiPrefix="/api">
          <div>Protected Altflow</div>
          <Logout />
        </AccountGate>
      </QueryClientProvider>
    </MastraReactProvider>,
  );
}
afterEach(cleanup);

describe('AccountGate', () => {
  describe('when the Go session is absent', () => {
    it('shows the email login instead of Altflow', async () => {
      server.use(http.get(`${endpoint}/account/session`, () => new HttpResponse(undefined, { status: 401 })));
      renderGate();
      expect(await screen.findByLabelText('Email')).toBeTruthy();
      expect(screen.queryByText('Protected Altflow')).toBeNull();
    });
  });
  describe('when authentication is unavailable', () => {
    it('keeps Altflow blocked and offers retry', async () => {
      server.use(http.get(`${endpoint}/account/session`, () => new HttpResponse(undefined, { status: 503 })));
      renderGate();
      expect(await screen.findByRole('button', { name: 'Retry' })).toBeTruthy();
      expect(screen.queryByText('Protected Altflow')).toBeNull();
    });
  });
  describe('when the integration is not installed', () => {
    it('leaves the original Altflow authentication in control', async () => {
      server.use(http.get(`${endpoint}/account/session`, () => new HttpResponse(undefined, { status: 404 })));
      renderGate();
      expect(await screen.findByText('Protected Altflow')).toBeTruthy();
    });
  });
  describe('when credentials are accepted by Go', () => {
    it('opens Altflow after the cookie login succeeds', async () => {
      server.use(
        http.get(`${endpoint}/account/session`, () => new HttpResponse(undefined, { status: 401 })),
        http.post(`${endpoint}/account/sign-in`, async ({ request }) => {
          expect(request.credentials).toBe('include');
          expect(await request.json()).toEqual({ email: 'alice@example.test', password: 'example-password' });
          return HttpResponse.json(creatorSession);
        }),
      );
      renderGate();
      fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'alice@example.test' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'example-password' } });
      fireEvent.submit(screen.getByRole('form', { name: 'Sign in' }));
      expect(await screen.findByText('Protected Altflow')).toBeTruthy();
    });
  });
  describe('when Go rejects the credentials', () => {
    it('keeps the form open with the server error', async () => {
      server.use(
        http.get(`${endpoint}/account/session`, () => new HttpResponse(undefined, { status: 401 })),
        http.post(`${endpoint}/account/sign-in`, () => HttpResponse.json({ error: '邮箱或密码错误' }, { status: 401 })),
      );
      renderGate();
      fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'alice@example.test' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } });
      fireEvent.submit(screen.getByRole('form', { name: 'Sign in' }));
      expect((await screen.findByRole('alert')).textContent).toBe('邮箱或密码错误');
      expect(screen.queryByText('Protected Altflow')).toBeNull();
    });
  });
  describe('when a signed in user logs out', () => {
    it('unmounts protected content after Go revokes the session', async () => {
      server.use(
        http.get(`${endpoint}/account/session`, () => HttpResponse.json(creatorSession)),
        http.post(`${endpoint}/account/sign-out`, () => HttpResponse.json({ ok: true })),
      );
      renderGate();
      fireEvent.click(await screen.findByRole('button', { name: '退出测试' }));
      expect(await screen.findByLabelText('Email')).toBeTruthy();
      expect(screen.queryByText('Protected Altflow')).toBeNull();
    });
  });
});

function PermissionSensitiveData() {
  const query = useQuery({
    queryKey: ['permission-sensitive'],
    queryFn: async () => (await fetch(`${endpoint}/api/permission-sensitive`)).json(),
    staleTime: Infinity,
  });
  return <span>{query.data?.label}</span>;
}

it('discards cached administrator data when the same account loses its role', async () => {
  let administrator = true;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  server.use(
    http.get(`${endpoint}/account/session`, () =>
      HttpResponse.json(
        administrator
          ? adminSession
          : { ...creatorSession, user: { ...creatorSession.user, id: adminSession.user.id } },
      ),
    ),
    http.get(`${endpoint}/api/permission-sensitive`, () =>
      HttpResponse.json({ label: administrator ? 'Admin management data' : 'Creator data' }),
    ),
  );
  render(
    <MastraReactProvider baseUrl={endpoint}>
      <QueryClientProvider client={client}>
        <AccountGate endpoint={endpoint} apiPrefix="/api">
          <PermissionSensitiveData />
        </AccountGate>
      </QueryClientProvider>
    </MastraReactProvider>,
  );
  expect(await screen.findByText('Admin management data')).toBeTruthy();
  administrator = false;
  await client.invalidateQueries({ queryKey: accountQueryKey({ endpoint, apiPrefix: '/api' }) });
  expect(await screen.findByText('Creator data')).toBeTruthy();
  expect(screen.queryByText('Admin management data')).toBeNull();
});
