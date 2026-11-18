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
            args: { path: 'story.txt' },
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
  ...conversation,
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
