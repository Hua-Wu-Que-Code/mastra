import { waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { useAltflowToolCatalog } from '../use-altflow-tool-catalog';
import { runtimeCatalog } from './fixtures/catalog';
import { server } from '@/test/msw-server';
import { renderHookWithProviders, TEST_BASE_URL } from '@/test/render';

describe('optional Altflow catalog', () => {
  describe('when the application provides its runtime catalog', () => {
    it('reads the application route outside a custom API prefix', async () => {
      server.use(
        http.get(`${TEST_BASE_URL}/altflow/tools/catalog`, () => HttpResponse.json({ entries: runtimeCatalog })),
      );
      const { result } = renderHookWithProviders(useAltflowToolCatalog, { apiPrefix: '/custom' });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(runtimeCatalog);
    });
  });
  describe('when this is a standard Mastra deployment', () => {
    it('falls back to the normal tool registry on 404', async () => {
      server.use(http.get(`${TEST_BASE_URL}/altflow/tools/catalog`, () => new HttpResponse(null, { status: 404 })));
      const { result } = renderHookWithProviders(useAltflowToolCatalog);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toBeNull();
    });
  });
  describe('when authentication expires', () => {
    it('reports the failure instead of hiding available runtime capabilities', async () => {
      server.use(http.get(`${TEST_BASE_URL}/altflow/tools/catalog`, () => new HttpResponse(null, { status: 401 })));
      const { result } = renderHookWithProviders(useAltflowToolCatalog);
      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toContain('401');
      expect(result.current.error).toHaveProperty('status', 401);
    });
  });
});
