import type { MastraClient } from '@mastra/client-js';
type Trace = Awaited<ReturnType<MastraClient['getTrace']>>;
export const span = (overrides: Partial<Trace['spans'][number]> = {}): Trace['spans'][number] => ({
  traceId: 'run',
  spanId: 'root',
  parentSpanId: null,
  name: 'Run',
  spanType: 'agent_run',
  isEvent: false,
  startedAt: '2026-11-16T07:54:00Z',
  endedAt: '2026-11-16T07:54:03Z',
  createdAt: '2026-11-16T07:54:00Z',
  updatedAt: null,
  status: 'success',
  ...overrides,
});
export const trace = (spans: Trace['spans']): Trace => ({ traceId: 'run', spans });
