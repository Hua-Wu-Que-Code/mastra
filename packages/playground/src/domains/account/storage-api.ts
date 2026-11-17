import { t } from '@mastra/playground-ui/lib/i18n';
import { z } from 'zod';
import type { StudioConfig } from '@/domains/configuration/types';

export const storedFileSchema = z.object({
  path: z.string(),
  name: z.string(),
  size: z.number().nonnegative(),
  mimeType: z.string(),
  source: z.enum(['upload', 'generated']),
  updatedAt: z.string(),
});
const storageSchema = z.object({
  quotaBytes: z.number().positive(),
  usedBytes: z.number().nonnegative(),
  reservedBytes: z.number().nonnegative(),
  files: z.array(storedFileSchema),
});
export type StoredFile = z.infer<typeof storedFileSchema>;
export type StorageSummary = z.infer<typeof storageSchema>;
type Target = Pick<StudioConfig, 'baseUrl' | 'headers'>;
export function storageUrl(target: Target, action = '', params?: Record<string, string>) {
  const url = new URL(`${target.baseUrl.replace(/\/$/, '')}/storage${action}`);
  if (params) url.search = new URLSearchParams(params).toString();
  return url.href;
}
async function storageRequest(target: Target, action: string, init?: RequestInit, params?: Record<string, string>) {
  const response = await fetch(storageUrl(target, action, params), {
    ...init,
    credentials: 'include',
    cache: 'no-store',
    redirect: 'error',
    headers: { ...target.headers, ...init?.headers },
  });
  if (!response.ok) {
    const error = z.object({ error: z.string() }).safeParse(await response.json().catch(() => undefined));
    throw new Error(error.success ? error.data.error : t('File storage is unavailable. Please retry.'));
  }
  return response;
}
export async function getStorage(target: Target) {
  return storageSchema.parse(await (await storageRequest(target, '')).json());
}
export async function uploadStoredFile(target: Target, file: File, id: string, contentType: string) {
  return storedFileSchema.parse(
    await (
      await storageRequest(
        target,
        '/upload',
        {
          method: 'POST',
          body: file,
          headers: { 'Content-Type': contentType },
        },
        { id, name: file.name },
      )
    ).json(),
  );
}
export async function deleteStoredFile(target: Target, path: string) {
  await storageRequest(target, '/file', { method: 'DELETE' }, { path });
}
export async function downloadStoredFile(target: Target, file: StoredFile) {
  const response = await storageRequest(target, '/download', undefined, { path: file.path });
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
