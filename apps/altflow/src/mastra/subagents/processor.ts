import type { Agent } from '@mastra/core/agent';
import type { ProcessInputStepArgs } from '@mastra/core/processors';
import type { SubagentRuntime } from './runtime';

const delegationTool = (name: string) =>
  ['subagent', 'subagent_fork', 'list_agents', 'send_message', 'wait_agent', 'interrupt_agent'].includes(name) ||
  name.startsWith('team_task_');

/** The root conversation's setting gates both delegation and shared team tasks. */
export function subagentProcessor(runtime: SubagentRuntime, getAgent?: () => Agent) {
  return {
    id: 'altflow-subagents',
    async processInputStep(args: ProcessInputStepArgs) {
      const info = args.messageList.serialize().memoryInfo;
      const actor = await runtime.actor(args.requestContext, info?.threadId);
      const model =
        typeof args.model === 'string'
          ? args.model
          : args.model &&
              typeof args.model === 'object' &&
              'provider' in args.model &&
              'modelId' in args.model &&
              String(args.model.provider).startsWith('altflow')
            ? `altflow/${args.model.modelId}`
            : undefined;
      const reasoning = args.providerOptions?.altflow?.reasoningLevel;
      const agent = args.agent ?? getAgent?.();
      if (agent)
        await runtime.attach(actor, agent, model, typeof reasoning === 'string' ? reasoning : undefined, args.runId);
      const enabled = await runtime.teamEnabled(actor);
      const tools = Object.fromEntries(
        Object.entries(args.tools ?? {}).filter(([name]) => enabled || !delegationTool(name)),
      );
      const inbox = await runtime.inbox(actor);
      const existing = new Set(args.messages.map(message => message.id));
      for (const mail of inbox)
        if (!existing.has(mail.id) && args.sendSignal)
          await args.sendSignal({
            id: mail.id,
            type: 'notification',
            tagName: 'subagent',
            contents: `${mail.sender}: ${mail.contents}`,
          });
      if (args.sendSignal)
        await runtime.acknowledge(
          actor,
          inbox.map(mail => mail.id),
        );
      args.messageList.clearSystemMessages('altflow-subagents');
      args.messageList.addSystem(
        `Your name is ${await runtime.selfName(actor)}. You share the current account's workspace with collaborators. Do not claim a child result before it arrives.\n${enabled ? 'Agent teamwork is enabled. Use subagent or subagent_fork for independent work and send_message to continue collaborators. Wait for required child results before answering. Use team_task_list/get, claim with the latest revision, perform work, then complete. Dependencies order work. Write scopes are advisory; split file edits to avoid overlaps. Task changes do not start agents or send messages. Use send_message when another agent must act.' : 'Agent teamwork is disabled. Do not create, fork, delegate to, or continue subagents. Work directly. Existing agents and tasks are preserved.'}`,
        'altflow-subagents',
      );
      return {
        tools,
        ...(args.activeTools
          ? {
              activeTools: args.activeTools.filter(name => enabled || !delegationTool(name)),
            }
          : {}),
      };
    },
  };
}
