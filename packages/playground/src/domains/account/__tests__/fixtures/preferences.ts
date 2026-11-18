import { http, HttpResponse } from 'msw';
import { z } from 'zod/v4';
import { server } from '@/test/msw-server';
import { TEST_BASE_URL } from '@/test/render';

const command = z.object({
  kind: z.string(),
  id: z.string(),
  patch: z.record(z.string(), z.unknown()),
  import: z.boolean().optional(),
});
export function installPreferenceFixture(initial: Record<string, Record<string, unknown>> = {}) {
  const entries = new Map(Object.entries(initial).map(([key, value]) => [key, { value, revision: 1 }]));
  let unavailable = false;
  server.use(
    http.get(`${TEST_BASE_URL}/account-preferences`, ({ request }) => {
      if (unavailable) return HttpResponse.json({ error: 'Preferences unavailable' }, { status: 503 });
      const params = new URL(request.url).searchParams;
      return HttpResponse.json(entries.get(`${params.get('kind')}:${params.get('id')}`) ?? { value: {}, revision: 0 });
    }),
    http.post(`${TEST_BASE_URL}/account-preferences`, async ({ request }) => {
      if (unavailable) return HttpResponse.json({ error: 'Preferences unavailable' }, { status: 503 });
      const input = command.parse(await request.json());
      const key = `${input.kind}:${input.id}`;
      const old = entries.get(key);
      if (input.import && old) return HttpResponse.json(old);
      const saved = { value: { ...old?.value, ...input.patch }, revision: (old?.revision ?? 0) + 1 };
      entries.set(key, saved);
      return HttpResponse.json(saved);
    }),
  );
  return {
    fail: (value: boolean) => {
      unavailable = value;
    },
    entries,
  };
}
