import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { storageFixture } from './__tests__/fixtures/storage';
import { StorageSettingsPage } from './storage-settings';
import { StudioConfigContext } from '@/domains/configuration/context/studio-config-state';
import { server } from '@/test/msw-server';

afterEach(cleanup);
const baseUrl = 'http://localhost:4111';
function show() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <StudioConfigContext.Provider value={{ baseUrl, headers: {}, isLoading: false, setConfig: () => {} }}>
        <MemoryRouter>
          <StorageSettingsPage />
        </MemoryRouter>
      </StudioConfigContext.Provider>
    </QueryClientProvider>,
  );
}
describe('StorageSettingsPage', () => {
  describe('when the account has uploaded documents and generated images', () => {
    it('shows real quota and opens the selected file category', async () => {
      server.use(http.get(`${baseUrl}/storage`, () => HttpResponse.json(storageFixture)));
      show();
      expect(await screen.findByText('35.2 MB used of 512 MB')).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: /Files/ }));
      expect(await screen.findByText('小说.txt')).toBeTruthy();
      expect(screen.queryByText('cover.png')).toBeNull();
    });
  });
  describe('when a file is deleted', () => {
    it('refreshes the quota and removes the file from management', async () => {
      let deleted = false;
      server.use(
        http.get(`${baseUrl}/storage`, () =>
          HttpResponse.json(
            deleted
              ? { ...storageFixture, usedBytes: storageFixture.usedBytes - 1024, files: storageFixture.files.slice(1) }
              : storageFixture,
          ),
        ),
        http.delete(`${baseUrl}/storage/file`, ({ request }) => {
          expect(new URL(request.url).searchParams.get('path')).toBe('/uploads/a/小说.txt');
          deleted = true;
          return HttpResponse.json({ ok: true });
        }),
      );
      show();
      fireEvent.click(await screen.findByRole('button', { name: /Files/ }));
      fireEvent.click(await screen.findByRole('button', { name: 'Delete 小说.txt' }));
      fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
      await waitFor(() => expect(screen.queryByText('小说.txt')).toBeNull());
      expect(deleted).toBe(true);
    });
  });
  describe('when OSS rejects deletion', () => {
    it('keeps the file and shows the server error', async () => {
      server.use(
        http.get(`${baseUrl}/storage`, () => HttpResponse.json(storageFixture)),
        http.delete(`${baseUrl}/storage/file`, () => HttpResponse.json({ error: 'Deletion denied' }, { status: 503 })),
      );
      show();
      fireEvent.click(await screen.findByRole('button', { name: /Files/ }));
      fireEvent.click(await screen.findByRole('button', { name: 'Delete 小说.txt' }));
      fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
      expect((await screen.findByRole('alert')).textContent).toContain('Deletion denied');
      expect(screen.getByText('小说.txt')).toBeTruthy();
    });
  });
});
