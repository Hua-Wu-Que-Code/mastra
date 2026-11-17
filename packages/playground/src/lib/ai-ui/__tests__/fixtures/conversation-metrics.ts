import type {
  MastraClient,
  ListMemoryThreadMessagesResponse,
  ListTracesResponse,
  CloneMemoryThreadResponse,
  ListAgentsModelProvidersResponse,
} from '@mastra/client-js';

export const measuredProviders: ListAgentsModelProvidersResponse = {
  providers: [
    {
      id: 'altflow',
      name: 'AltFlow',
      envVar: 'ALTFLOW_MODELHUB_API_KEY',
      connected: true,
      models: ['qwen3.8-flash'],
      modelContextWindows: { 'qwen3.8-flash': 131072 },
      modelReasoning: {
        'qwen3.8-flash': {
          defaultLevel: 'off',
          levels: ['off', 'high', 'max'],
          contextWindows: { off: 131072, high: 1048576 },
        },
      },
    },
  ],
};

export const measuredConversation: ListMemoryThreadMessagesResponse['messages'] = [
  {
    id: 'question',
    role: 'user',
    createdAt: new Date('2026-11-16T07:54:00Z'),
    content: { format: 2, parts: [{ type: 'text', text: 'What can you do?' }] },
  },
  {
    id: 'analysis',
    role: 'assistant',
    createdAt: new Date('2026-11-16T07:54:00Z'),
    content: {
      format: 2,
      metadata: { traceId: 'measured-run' },
      parts: [{ type: 'reasoning', reasoning: 'Compare the available tools.' }],
    },
  },
  {
    id: 'answer',
    role: 'assistant',
    createdAt: new Date('2026-11-16T07:54:03Z'),
    content: {
      format: 2,
      metadata: { traceId: 'measured-run' },
      parts: [{ type: 'text', text: 'I can help write your story.' }],
    },
  },
];

const root: Awaited<ReturnType<MastraClient['getTrace']>>['spans'][number] = {
  traceId: 'measured-run',
  spanId: 'root',
  parentSpanId: null,
  name: 'Agent run',
  spanType: 'agent_run',
  isEvent: false,
  startedAt: '2026-11-16T07:54:00Z',
  endedAt: '2026-11-16T07:54:03Z',
  createdAt: '2026-11-16T07:54:00Z',
  updatedAt: null,
  status: 'success',
};

// The generation repeats its child inference's usage. Counting both doubles the bill.
export const measuredTrace: Awaited<ReturnType<MastraClient['getTrace']>> = {
  traceId: root.traceId,
  spans: [
    root,
    {
      ...root,
      spanId: 'generation',
      parentSpanId: 'root',
      spanType: 'model_generation',
      attributes: { model: 'qwen3.8-flash', provider: 'altflow', usage: { inputTokens: 39422, outputTokens: 133 } },
    },
    { ...root, spanId: 'step', parentSpanId: 'generation', spanType: 'model_step' },
    {
      ...root,
      spanId: 'inference',
      parentSpanId: 'step',
      spanType: 'model_inference',
      input: [
        { role: 'system', content: 'You are a story assistant.' },
        { role: 'user', content: 'What can you do?' },
      ],
      attributes: {
        tools: [{ name: 'read_file', description: 'Read a file' }],
        model: 'qwen3.8-flash',
        provider: 'altflow',
        completionStartTime: new Date('2026-11-16T07:54:01Z'),
        usage: {
          inputTokens: 39422,
          outputTokens: 133,
          inputDetails: { cacheRead: 32000, cacheWrite: 0 },
          outputDetails: { reasoning: 33 },
        },
      },
    },
  ],
};

export const olderTrace: Awaited<ReturnType<MastraClient['getTrace']>> = {
  traceId: 'older-run',
  spans: measuredTrace.spans.map(span => ({ ...span, traceId: 'older-run' })),
};
export const tracePage = (page: number): ListTracesResponse => ({
  spans: page === 0 ? [olderTrace.spans[0]!] : [measuredTrace.spans[0]!],
  pagination: { total: 2, page, perPage: 1, hasMore: page === 0 },
});
export const branchPages: ListMemoryThreadMessagesResponse[] = [
  { messages: measuredConversation.slice(0, 1), hasMore: true },
  {
    messages: [...measuredConversation.slice(1), { ...measuredConversation[0]!, id: 'future-message' }],
    hasMore: false,
  },
];
export const branchedThread: CloneMemoryThreadResponse = {
  thread: {
    id: 'branched-thread',
    resourceId: 'agent-1',
    createdAt: new Date('2026-11-16T08:00:00Z'),
    updatedAt: new Date('2026-11-16T08:00:00Z'),
  },
  clonedMessages: measuredConversation,
};
