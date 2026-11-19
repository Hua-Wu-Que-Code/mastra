import type { GetToolResponse } from '@mastra/client-js';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ToolsList } from '../tools-list';
import { runtimeCatalog } from '@/domains/tools/hooks/__tests__/fixtures/catalog';
import { TestLinkProvider } from '@/test/link-provider';
import { renderWithProviders } from '@/test/render';

const countText: GetToolResponse = { id: 'count-text', description: 'Count characters.' };
describe('runtime capabilities in the tool list', () => {
  describe('when the registry and runtime catalog overlap', () => {
    it('deduplicates tools, shows missing credentials and links every runtime tool to its details', () => {
      renderWithProviders(
        <TestLinkProvider>
          <ToolsList tools={{ countText }} agents={{}} isLoading={false} catalog={runtimeCatalog} />
        </TestLinkProvider>,
      );
      expect(screen.getAllByText('count-text')).toHaveLength(1);
      expect(screen.getByText('mastra_workspace_read_file')).toBeTruthy();
      expect(screen.getByText(/Configure a search provider/)).toBeTruthy();
      expect(screen.getAllByRole('link')).toHaveLength(runtimeCatalog.length);
      expect(screen.getByRole('link', { name: /count-text/ }).textContent).toContain('count-text');
      expect(screen.getByText(/Enabled in conversation/)).toBeTruthy();
    });
  });
});
