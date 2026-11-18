import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      // Keep shared UI contexts on this checkout when dependencies are linked from another worktree.
      // Match only these modules so child paths such as i18n/language-select retain their package exports.
      {
        find: /^@mastra\/playground-ui\/lib\/i18n\/trans$/,
        replacement: path.resolve(__dirname, '../playground-ui/dist/lib/i18n/trans.es.js'),
      },
      {
        find: /^@mastra\/playground-ui\/lib\/framework$/,
        replacement: path.resolve(__dirname, '../playground-ui/dist/lib/framework.es.js'),
      },
      {
        find: /^@mastra\/playground-ui\/lib\/i18n$/,
        replacement: path.resolve(__dirname, '../playground-ui/dist/lib/i18n.es.js'),
      },
      // Force a single React instance across all workspace packages (e.g.
      // @mastra/react, @mastra/playground-ui) so hooks share the same
      // internals.  Without this, pnpm may resolve different patch versions
      // for devDependencies vs catalog entries, causing "Invalid hook call"
      // errors in jsdom tests.
      { find: 'react', replacement: path.resolve(__dirname, 'node_modules/react') },
      { find: 'react-dom', replacement: path.resolve(__dirname, 'node_modules/react-dom') },
    ],
  },
  test: {
    name: 'unit:packages/playground',
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 15_000,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['e2e/**', '**/node_modules/**'],
    // @mcp-ui/client's AppRenderer sends hostContext before its bridge connects and drops the rejected promise.
    onUnhandledError: error => !(error.message === 'Not connected' && error.stack?.includes('sendHostContextChange')),
  },
});
