import { createTool } from '@mastra/core/tools';
import type { ToolExecutionContext } from '@mastra/core/tools';
import { z } from 'zod';
import type { SubagentRuntime } from './runtime';
import { taskSchema } from './store';
import { TeamBoard } from './team';

const text = z.string().trim().min(1).max(32000);
const name = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9_-]+$/);
const scopes = z
  .array(
    z
      .string()
      .min(1)
      .max(2048)
      .refine(path => !path.startsWith('/') && !path.split('/').includes('..'), 'Use workspace-relative scopes'),
  )
  .max(100);
export function createSubagentTools(runtime: SubagentRuntime) {
  const actor = (context?: ToolExecutionContext) => runtime.actor(context?.requestContext, context?.agent?.threadId);
  const board = new TeamBoard(runtime);
  const taskView = taskSchema.extend({
    ready: z.boolean(),
    writeScopeWarnings: z.array(z.string()),
  });
  const startSchema = z
    .object({
      name: name.optional(),
      description: z.string().min(1).max(1000),
      prompt: text,
    })
    .strict();
  const start = (fork: boolean) =>
    createTool({
      id: fork ? 'subagent_fork' : 'subagent',
      description: `${fork ? 'Fork completed conversation turns into' : 'Start'} a dynamically created background subagent. Returns its name immediately. Use send_message, list_agents, wait_agent and interrupt_agent to coordinate. Requires agent teamwork to be enabled. Maximum depth is 1.`,
      inputSchema: startSchema,
      outputSchema: z.object({
        kind: z.literal('activation'),
        name: z.string(),
      }),
      execute: async (input, context) => {
        const self = await actor(context);
        const history = [...(context?.agent?.getMessages?.() ?? [])];
        // The fork sees completed turns only, excluding this in-flight user turn and tool calls.
        let current = -1;
        for (let i = history.length - 1; i >= 0; i--) {
          const message = history[i]!;
          const signal = message.content.metadata?.signal;
          if (
            message.role === 'user' ||
            (message.role === 'signal' &&
              typeof signal === 'object' &&
              signal &&
              'type' in signal &&
              signal.type === 'user')
          ) {
            current = i;
            break;
          }
        }
        return runtime.spawn(self, input, fork && current >= 0 ? history.slice(0, current) : []);
      },
    });
  return {
    subagent: start(false),
    subagent_fork: start(true),
    list_agents: createTool({
      id: 'list_agents',
      description:
        'List agents in your current conversation tree, including saved results and recoverable interrupted agents.',
      inputSchema: z.object({}).strict(),
      outputSchema: z.object({
        agents: z.array(
          z.object({
            name: z.string(),
            state: z.string(),
            parent: z.string().optional(),
            description: z.string().optional(),
            result: z.string().optional(),
            error: z.string().optional(),
          }),
        ),
      }),
      execute: async (_, c) => runtime.list(await actor(c)),
    }),
    send_message: createTool({
      id: 'send_message',
      description:
        'Send a message to an agent in this conversation tree. A working agent receives it at its next step; an idle or interrupted child starts a new turn from saved history.',
      inputSchema: z.object({ agent: z.string().min(1).max(500), message: text }).strict(),
      outputSchema: z.object({ messageId: z.string() }),
      execute: async (input, c) => runtime.message(await actor(c), input.agent, input.message),
    }),
    wait_agent: createTool({
      id: 'wait_agent',
      description:
        'Wait for collaborator messages or completion notices. Read the next-step inbox after this returns. Do not poll list_agents in a loop.',
      inputSchema: z
        .object({
          timeout_ms: z.number().int().min(10000).max(3600000).default(30000),
        })
        .strict(),
      outputSchema: z.object({ timedOut: z.boolean() }),
      execute: async (input, c) => runtime.wait(await actor(c), input.timeout_ms, c?.abortSignal),
    }),
    interrupt_agent: createTool({
      id: 'interrupt_agent',
      description:
        'Interrupt a child without deleting its conversation. Continue it later with send_message. Only ancestors can interrupt their descendants.',
      inputSchema: z.object({ agent: z.string().min(1).max(500) }).strict(),
      outputSchema: z.object({ accepted: z.boolean() }),
      execute: async (input, c) => runtime.interrupt(await actor(c), input.agent),
    }),
    team_task_create: createTool({
      id: 'team_task_create',
      description: 'Create an unowned pending task on this conversation shared task board.',
      inputSchema: z
        .object({
          subject: z.string().min(1).max(1000),
          description: text,
          blocked_by: z.array(z.string()).max(100).optional(),
          write_scopes: scopes.optional(),
        })
        .strict(),
      outputSchema: taskView,
      execute: async (input, c) => board.create(await actor(c), input),
    }),
    team_task_get: createTool({
      id: 'team_task_get',
      description: 'Read a shared task and its current revision before making changes.',
      inputSchema: z.object({ task_id: z.string() }).strict(),
      outputSchema: taskView,
      execute: async (input, c) => board.get(await actor(c), input.task_id),
    }),
    team_task_list: createTool({
      id: 'team_task_list',
      description: 'List shared tasks, readiness, owners, dependencies and write-scope overlap warnings.',
      inputSchema: z
        .object({
          status: z.enum(['pending', 'in_progress', 'completed']).optional(),
          owner: z.string().optional(),
          unowned: z.boolean().optional(),
          ready: z.boolean().optional(),
          cursor: z.number().int().nonnegative().optional(),
          limit: z.number().int().min(1).max(100).optional(),
        })
        .strict()
        .refine(
          input => input.owner === undefined || input.unowned === undefined,
          'owner and unowned cannot be combined',
        ),
      outputSchema: z.object({
        tasks: z.array(taskView),
        nextCursor: z.number().optional(),
      }),
      execute: async (input, c) => board.list(await actor(c), input),
    }),
    team_task_update: createTool({
      id: 'team_task_update',
      description:
        'Apply a shared task transition with its latest expected_revision. Reassign is lead-only. Dependencies must be acyclic. Task changes never start agents.',
      inputSchema: z
        .object({
          task_id: z.string(),
          expected_revision: z.number().int().positive(),
          action: z.enum(['claim', 'release', 'edit', 'set_dependencies', 'complete', 'reopen', 'reassign', 'delete']),
          subject: z.string().min(1).max(1000).optional(),
          description: text.optional(),
          blocked_by: z.array(z.string()).max(100).optional(),
          write_scopes: scopes.optional(),
          owner: z.string().optional(),
        })
        .strict(),
      outputSchema: taskView,
      execute: async (input, c) => board.update(await actor(c), input),
    }),
  };
}
