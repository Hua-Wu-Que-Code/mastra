import type { MastraDBMessage } from '@mastra/core/agent/message-list';
import type { ChatTrace } from '../../chat-metrics';
import { span, trace } from './trace';

export const streamingMessages: MastraDBMessage[] = [
  {
    id: 'assistant',
    role: 'assistant',
    createdAt: new Date('2026-11-16T07:54:00Z'),
    content: { format: 2, parts: [{ type: 'text', text: 'Working' }], metadata: { traceId: 'run' } },
  },
];

export const pendingTrace: ChatTrace = trace([
  span({ endedAt: null }),
  span({
    spanId: 'call',
    parentSpanId: 'root',
    spanType: 'model_inference',
    endedAt: null,
    attributes: { provider: 'altflow.chat', model: 'model' },
  }),
]);

export const completedTrace: ChatTrace = trace([
  span(),
  span({
    spanId: 'call',
    parentSpanId: 'root',
    spanType: 'model_inference',
    attributes: {
      provider: 'altflow.chat',
      model: 'model',
      usage: { inputTokens: 1000, outputTokens: 200, inputDetails: { cacheRead: 800, cacheWrite: 0 } },
    },
  }),
]);
