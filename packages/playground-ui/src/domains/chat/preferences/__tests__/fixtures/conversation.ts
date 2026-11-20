import type { MastraDBMessage } from '@mastra/core/agent/message-list';

export const conversation: MastraDBMessage[] = [
  {
    id: 'question',
    role: 'user',
    createdAt: new Date(),
    content: { format: 2, parts: [{ type: 'text', text: 'Write a story.' }] },
  },
  {
    id: 'answer',
    role: 'assistant',
    createdAt: new Date(),
    content: {
      format: 2,
      parts: [
        { type: 'text', text: 'I will check the material first.' },
        { type: 'reasoning', reasoning: 'Compare the two characters.\nKeep their motives consistent.' },
        {
          type: 'tool-invocation',
          toolInvocation: {
            toolCallId: 'read-1',
            toolName: 'read_file',
            args: { path: '/uploads/private-attachment/story.txt', offset: 771, limit: 26 },
            state: 'result',
            result: 'A story draft',
          },
        },
        { type: 'text', text: 'The final story begins here.' },
      ],
    },
  },
];

export const failedConversation: MastraDBMessage[] = [
  ...conversation.filter(message => message.role === 'user'),
  {
    id: 'failure',
    role: 'assistant',
    createdAt: new Date(),
    content: {
      format: 2,
      parts: [
        {
          type: 'tool-invocation',
          toolInvocation: {
            toolCallId: 'failed',
            toolName: 'read_file',
            args: { path: 'missing.txt' },
            state: 'output-error',
            errorText: 'File not found',
          },
        },
      ],
    },
  },
];

export const failedConversationWithNotifications: MastraDBMessage[] = [
  ...failedConversation,
  {
    id: 'live-notification',
    role: 'assistant',
    createdAt: new Date(),
    content: {
      format: 2,
      parts: [
        {
          type: 'data-signal',
          data: { type: 'notification', tagName: 'subagent', contents: 'Scan A completed.' },
        },
        {
          type: 'data-signal',
          data: { type: 'notification', tagName: 'external', contents: 'External event received.' },
        },
      ],
    },
  },
  {
    id: 'saved-notification',
    role: 'signal',
    createdAt: new Date(),
    content: {
      format: 2,
      metadata: { signal: { type: 'notification', tagName: 'subagent' } },
      parts: [{ type: 'text', text: 'Scan B completed.' }],
    },
  },
  ...conversation
    .filter(message => message.role === 'assistant')
    .map(message => ({
      ...message,
      content: { ...message.content, parts: message.content.parts.slice(-1) },
    })),
  {
    id: 'stream-error-with-notifications',
    role: 'assistant',
    createdAt: new Date(),
    content: {
      format: 2,
      metadata: { status: 'error' },
      parts: [{ type: 'text', text: 'The model request failed.' }],
    },
  },
];

export const failedRunConversation: MastraDBMessage[] = [
  ...conversation.map(message =>
    message.role === 'assistant'
      ? { ...message, content: { ...message.content, parts: message.content.parts.slice(0, -1) } }
      : message,
  ),
  {
    id: 'stream-error',
    role: 'assistant',
    createdAt: new Date(),
    content: {
      format: 2,
      metadata: { status: 'error' },
      parts: [{ type: 'text', text: 'The model request failed.' }],
    },
  },
];

export const approvalConversation: MastraDBMessage[] = [
  ...conversation,
  {
    id: 'approval',
    role: 'assistant',
    createdAt: new Date(),
    content: {
      format: 2,
      metadata: {
        requireApprovalMetadata: { 'approve-1': { toolCallId: 'approve-1', toolName: 'dangerousTool', args: {} } },
      },
      parts: [
        {
          type: 'tool-invocation',
          toolInvocation: { toolCallId: 'approve-1', toolName: 'dangerousTool', args: {}, state: 'call' },
        },
      ],
    },
  },
];

/** Successful bookkeeping calls are hidden by the transcript, alongside visible work. */
export function conversationWithBookkeeping(toolName: string): MastraDBMessage[] {
  return [
    ...conversation,
    {
      id: 'bookkeeping',
      role: 'assistant',
      createdAt: new Date(),
      content: {
        format: 2,
        parts: [
          {
            type: 'tool-invocation',
            toolInvocation: {
              toolCallId: 'bookkeeping-1',
              toolName,
              args: {},
              state: 'result',
              result: { success: true },
            },
          },
        ],
      },
    },
  ];
}
