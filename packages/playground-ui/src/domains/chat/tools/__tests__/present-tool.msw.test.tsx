// @vitest-environment jsdom
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { PresentTool } from '../present-tool';
import { toolCardKind } from '../tool-card-kind';
import { server } from '@/test/msw-server';
import { renderWithProviders, TEST_BASE_URL } from '@/test/render';

const output = {
  files: [
    {
      path: '/reports/调研.md',
      name: '调研.md',
      size: 123,
      mimeType: 'text/markdown',
      description: 'The completed report.',
      downloadUrl: 'https://untrusted.example/credential-target',
    },
  ],
};
describe('delivered files', () => {
  describe('when the tool call is read back from history', () => {
    it('keeps the deliverable outside the collapsed activity group and downloads from the authenticated storage host', async () => {
      const requested: string[] = [];
      server.use(
        http.get(`${TEST_BASE_URL}/storage/download`, ({ request }) => {
          requested.push(new URL(request.url).searchParams.get('path') ?? '');
          return HttpResponse.text('# Delivered report');
        }),
      );
      const create = vi.fn(() => 'blob:report');
      Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: create });
      Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
      renderWithProviders(<PresentTool output={output} />);
      fireEvent.click(screen.getByRole('button', { name: 'Download 调研.md' }));
      await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
      expect(requested).toEqual(['/reports/调研.md']);
      expect(create.mock.calls).toHaveLength(1);
      expect(
        toolCardKind({ toolName: 'present', toolCallId: 'delivery', input: {}, output, state: 'result' }, {}),
      ).toBe('present');
      click.mockRestore();
    });
  });
  describe('when a previously delivered file was deleted', () => {
    it('shows an unavailable message without offering a fake download', async () => {
      server.use(http.get(`${TEST_BASE_URL}/storage/download`, () => new HttpResponse(null, { status: 404 })));
      renderWithProviders(<PresentTool output={output} />);
      fireEvent.click(screen.getByRole('button', { name: 'Download 调研.md' }));
      expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'This file is no longer available.');
    });
  });
});
