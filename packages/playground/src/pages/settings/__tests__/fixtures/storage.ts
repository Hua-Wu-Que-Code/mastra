import type { StorageSummary } from '@/domains/account/storage-api';

export const storageFixture: StorageSummary = {
  quotaBytes: 512 * 1024 * 1024,
  usedBytes: 35.2 * 1024 * 1024,
  reservedBytes: 0,
  files: [
    {
      path: '/uploads/a/小说.txt',
      name: '小说.txt',
      size: 1024,
      mimeType: 'text/plain',
      source: 'upload',
      updatedAt: '2026-11-18T00:00:00Z',
    },
    {
      path: '/cover.png',
      name: 'cover.png',
      size: 35.2 * 1024 * 1024 - 1024,
      mimeType: 'image/png',
      source: 'generated',
      updatedAt: '2026-11-18T01:00:00Z',
    },
  ],
};
