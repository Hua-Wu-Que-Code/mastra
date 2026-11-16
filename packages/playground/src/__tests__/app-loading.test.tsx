import { cleanup, render, screen } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

import AppWrapper from '../App';
import { server } from '@/test/msw-server';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe('Studio cold load', () => {
  it('shows a loading spinner while the instance probe is in flight', async () => {
    server.use(
      // A generic Studio instance does not mount the optional Go account adapter.
      http.get('http://localhost:4111/account/session', () => new HttpResponse(null, { status: 404 })),
      http.get('http://localhost:4111/api/auth/capabilities', () => delay('infinite')),
    );

    render(<AppWrapper />);

    expect(await screen.findByRole('status', { name: 'Loading' })).toBeTruthy();
  });
});
