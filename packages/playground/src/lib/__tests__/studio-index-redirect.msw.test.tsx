import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { StudioIndexRedirect } from '../studio-index-redirect';
import { creatorSession } from '@/domains/account/__tests__/fixtures/session';
import type { AccountSession } from '@/domains/account/account-api';
import { AccountContext } from '@/domains/account/account-context';
import { RoleImpersonationProvider } from '@/domains/auth/context/role-impersonation-context';
import { server } from '@/test/msw-server';
import { renderWithProviders, TEST_BASE_URL } from '@/test/render';

function Destination() {
  return <output>{useLocation().pathname}</output>;
}

function renderHome(account?: AccountSession) {
  return renderWithProviders(
    <AccountContext.Provider value={account}>
      <RoleImpersonationProvider>
        <Routes>
          <Route path="/" element={<StudioIndexRedirect />} />
          <Route path="*" element={<Destination />} />
        </Routes>
      </RoleImpersonationProvider>
    </AccountContext.Provider>,
    { router: { initialEntries: ['/'] } },
  );
}

beforeEach(() => {
  server.use(
    http.get(`${TEST_BASE_URL}/api/auth/capabilities`, () => HttpResponse.json({ enabled: false, login: null })),
    http.get(`${TEST_BASE_URL}/api/agents`, () => HttpResponse.json({ 'creator-agent': { name: 'Creator' } })),
  );
});

describe('Home destination', () => {
  it('opens a new conversation for an Altflow creator', async () => {
    renderHome(creatorSession);
    expect(await screen.findByText('/chat/creator-agent/threads/new')).toBeTruthy();
  });

  it('keeps the accessible fallback when there are no agents', async () => {
    server.use(http.get(`${TEST_BASE_URL}/api/agents`, () => HttpResponse.json({})));
    renderHome(creatorSession);
    expect(await screen.findByText('/agents')).toBeTruthy();
  });

  it('preserves the native Studio landing page', async () => {
    renderHome();
    expect(await screen.findByText('/agents')).toBeTruthy();
  });
});
