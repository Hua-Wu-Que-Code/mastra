import type { ConversationTreeSnapshot } from '../../subagent-api';
export const tree: ConversationTreeSnapshot = {
  title: 'Research report',
  children: [
    {
      id: 'child-one',
      name: 'agent-1',
      description: 'Research sources',
      state: 'completed',
      elapsedMs: 92000,
      totalTokens: 114000,
    },
  ],
  messages: [],
  hasMore: false,
  page: 0,
  teamEnabled: false,
  tasks: [],
};
export const childTree: ConversationTreeSnapshot = {
  ...tree,
  messages: [
    {
      id: 'message-one',
      role: 'assistant',
      text: 'Verified sources for the report.',
      tools: [],
      createdAt: '2026-11-18T12:00:00Z',
    },
  ],
};
