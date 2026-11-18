import { http, HttpResponse } from 'msw';
import { z } from 'zod';
import { threadPreferencesSchema } from '../../../context/thread-preferences';

const record = z.record(z.string(), z.unknown());
function merge(current: Record<string, unknown>, patch: Record<string, unknown>): Record<string, unknown> {
  const next = { ...current };
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) delete next[key];
    else if (record.safeParse(value).success) next[key] = merge(record.parse(next[key] ?? {}), record.parse(value));
    else next[key] = value;
  }
  return next;
}
/** The real hook persists over HTTP; this fixture models its durable endpoint. */
export function threadPreferenceHandlers(baseUrl: string) {
  let value = threadPreferencesSchema.parse({});
  let revision = 0;
  return [
    http.get(`${baseUrl}/account-preferences`, () => HttpResponse.json({ value, revision })),
    http.post(`${baseUrl}/account-preferences`, async ({ request }) => {
      const command = z.object({ patch: record }).parse(await request.json());
      value = threadPreferencesSchema.parse(merge(record.parse(value), command.patch));
      return HttpResponse.json({ value, revision: ++revision });
    }),
  ];
}
