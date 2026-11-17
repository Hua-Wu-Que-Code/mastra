import { MockLanguageModelV2 } from '@internal/ai-sdk-v5/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod/v4';
import { createTool } from '../../tools';
import { Agent } from '../agent';

describe('Agent teamwork execution selection', () => {
  it('omits delegation tools only for the disabled invocation and keeps ordinary tools', async () => {
    const advertised: string[][] = [];
    const model = new MockLanguageModelV2({
      doGenerate: async options => {
        advertised.push(options.tools?.map(tool => tool.name) ?? []);
        return {
          content: [{ type: 'text', text: 'Done' }],
          finishReason: 'stop',
          usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
          warnings: [],
          rawCall: { rawPrompt: null, rawSettings: {} },
        };
      },
    });
    const researcher = new Agent({ id: 'researcher', name: 'researcher', instructions: 'Research', model });
    const agent = new Agent({
      id: 'supervisor',
      name: 'supervisor',
      instructions: 'Delegate when useful',
      model,
      agents: { researcher },
      tools: {
        ordinary: createTool({
          id: 'ordinary',
          description: 'Ordinary tool',
          inputSchema: z.object({}),
          execute: async () => 'ok',
        }),
      },
    });
    await agent.generate('Hello', { disableSubAgents: true });
    await agent.generate('Hello', { disableSubAgents: false });
    expect(advertised[0]).toContain('ordinary');
    expect(advertised[0]).not.toContain('agent-researcher');
    expect(advertised[1]).toContain('agent-researcher');
    const restored = await agent.getToolsForExecution({ disableSubAgents: true });
    expect(restored).toHaveProperty('ordinary');
    expect(restored).not.toHaveProperty('agent-researcher');
  });
});
