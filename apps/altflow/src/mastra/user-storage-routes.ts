import { registerApiRoute } from '@mastra/core/server';
import { z } from 'zod';
import type { AltFlowUser } from './altflow-auth.ts';
import { FileStorageError } from './user-storage.ts';
import type { UserStorage } from './user-storage.ts';

const uploadParams = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),
  name: z
    .string()
    .min(1)
    .max(240)
    .refine(name => !/[\\/\x00-\x1f]/.test(name)),
});
async function readBody(request: Request, maxBytes: number) {
  const size = Number(request.headers.get('content-length'));
  if (size > maxBytes) throw new FileStorageError('文件超过可用存储空间', 413);
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      bytes += next.value.length;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw new FileStorageError('文件超过可用存储空间', 413);
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}
export function userStorageRoutes(
  store: UserStorage,
  authenticate: (request: Request) => Promise<AltFlowUser | null>,
  origins: string[],
) {
  // Custom routes share Go-backed authentication and validate Origin for cookie writes.
  const route = (
    path: string,
    method: 'GET' | 'POST' | 'DELETE',
    action: (request: Request, owner: string) => Promise<Response>,
  ) =>
    registerApiRoute(path, {
      method,
      requiresAuth: false,
      handler: async c => {
        try {
          const user = await authenticate(c.req.raw);
          if (!user) return c.json({ error: '请先登录' }, 401);
          const origin = c.req.header('origin');
          if ((origin && !origins.includes(origin)) || (method !== 'GET' && !c.req.header('authorization') && !origin))
            return c.json({ error: '不允许的请求来源' }, 403);
          const response = await action(c.req.raw, user.id);
          response.headers.set('Cache-Control', 'no-store');
          response.headers.set('X-Content-Type-Options', 'nosniff');
          return response;
        } catch (error) {
          if (error instanceof FileStorageError) return c.json({ error: error.message }, error.status);
          if (error instanceof z.ZodError) return c.json({ error: '文件参数无效' }, 400);
          // SDK errors can include signed request headers: never return or log them.
          return c.json({ error: '文件存储服务暂不可用，请重试' }, 503);
        }
      },
    });
  return [
    route('/storage', 'GET', async (_, owner) =>
      Response.json({ ...(await store.summary(owner)), files: await store.list(owner) }),
    ),
    route('/storage/upload', 'POST', async (request, owner) => {
      const params = uploadParams.parse(Object.fromEntries(new URL(request.url).searchParams));
      const file = await store.write(
        owner,
        `/uploads/${params.id}/${params.name}`,
        await readBody(request, store.quota),
        {
          mimeType: request.headers.get('content-type')?.split(';')[0] ?? 'application/octet-stream',
          source: 'upload',
          overwrite: false,
        },
      );
      return Response.json(file, { status: 201 });
    }),
    route('/storage/file', 'DELETE', async (request, owner) => {
      const path = new URL(request.url).searchParams.get('path');
      if (!path) throw new FileStorageError('请选择文件');
      await store.remove(owner, path);
      return Response.json({ ok: true });
    }),
    route('/storage/download', 'GET', async (request, owner) => {
      const path = new URL(request.url).searchParams.get('path');
      if (!path) throw new FileStorageError('请选择文件');
      const file = await store.info(owner, path);
      const data = await store.read(owner, path);
      return new Response(new Uint8Array(data), {
        headers: {
          'Content-Type': file.mimeType,
          'Content-Length': String(data.length),
          'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
          'Content-Security-Policy': "default-src 'none'; sandbox",
        },
      });
    }),
  ];
}
