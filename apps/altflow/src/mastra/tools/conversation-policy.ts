import { createHash } from 'node:crypto';
import type { ProcessInputStepArgs, ProcessLLMRequestArgs } from '@mastra/core/processors';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const tag = 'altflow-conversation-tools';
const spillName = 'read_tool_result';
const officeTools = ['office_convert', 'office_render', 'office_recalculate'];
const counted =
  /(?:[总共多少几]个?(?:字|字符|词|段(?:落)?)(?!内)|字数|字符数|词数|段落数|篇幅检查|word count|character count|count (?:the )?(?:words|characters|paragraphs))/iu;
const noCount =
  /(?:不用|无需|不要|不必|别)(?:再|去)?(?:统计|计算|检查|数)?(?:字数|字符数|词数|段落数)|(?:do not|don.t|no need to) count/iu;
const officeRequested = /(?:转(?:换|成|为)|另存|导出|渲染|版式|排版|重算|重新计算|convert|export|render|recalculat)/iu;
const officeTarget =
  /(?:office|word|excel|powerpoint|pdf|docx?|xlsx?|pptx?|od[tsp]|csv|工作表|表格|文档|幻灯片|演示文稿|公式|页(?:面|码)|这一页|第[一二三四五六七八九十\d]+页|版面|版式|排版|png)/iu;
const pagedRead = /^(?:(?:mastra_)?workspace_)?read_file$|^read_document$|^read_tool_result$/;
const spillThreshold = 24_000;
const pageSize = 8_000;
const maxSpills = 64;

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonical(item)]),
    );
  }
  return value;
}

function requestedText(args: ProcessInputStepArgs) {
  return (
    [...args.messageList.get.input.db()]
      .reverse()
      .find(message => message.role === 'user')
      ?.content.parts.flatMap(part =>
        part.type === 'text'
          ? [
              part.text
                .split('\n')
                .filter(line => !/^\s*(?:\d+\.\s+)?\s*>/.test(line))
                .join('\n'),
            ]
          : [],
      )
      .join('\n') ?? ''
  );
}

/** Per-run scope keeps the original transcript intact and spill lookup private to its prompt. */
export function conversationToolPolicy() {
  const spilledByRun = new WeakMap<Record<string, unknown>, Map<string, string>>();
  const input = z.object({ id: z.string().regex(/^[a-f0-9]{32}$/), offset: z.number().int().nonnegative().default(0) });

  return {
    id: tag,
    processInputStep(args: ProcessInputStepArgs) {
      const request = requestedText(args);
      const calls = args.steps.flatMap(step => step.toolCalls ?? []);
      const officeSkillRead = args.steps.some(step =>
        (step.toolResults ?? []).some(result => {
          if (result.toolName !== 'skill_read' && result.toolName !== 'skill') return false;
          const call = calls.find(call => call.toolCallId === result.toolCallId);
          const skill = z
            .object({ name: z.string().optional(), skillName: z.string().optional() })
            .safeParse(call?.input);
          const invocation = args.messages
            .flatMap(message => message.content.parts)
            .find(
              part =>
                part.type === 'tool-invocation' &&
                part.toolInvocation.toolCallId === result.toolCallId &&
                part.toolInvocation.state === 'result',
            );
          const output =
            invocation?.type === 'tool-invocation' && invocation.toolInvocation.state === 'result'
              ? invocation.toolInvocation.result
              : undefined;
          return (
            skill.success &&
            /(?:office|spreadsheet|文档处理|电子表格)/iu.test(skill.data.skillName ?? skill.data.name ?? '') &&
            typeof output === 'string' &&
            Boolean(output.trim()) &&
            !/not found|^Binary file:/i.test(output.slice(0, 250))
          );
        }),
      );
      const allowed = (name: string) => {
        if (name === 'countText' || name === 'count-text') return counted.test(request) && !noCount.test(request);
        if (officeTools.includes(name))
          return officeSkillRead || (officeRequested.test(request) && officeTarget.test(request));
        return true;
      };
      const tools = Object.fromEntries(Object.entries(args.tools ?? {}).filter(([name]) => allowed(name)));
      const activeTools = args.activeTools?.filter(allowed);
      let spilled = spilledByRun.get(args.state);
      if (!spilled) {
        spilled = new Map();
        spilledByRun.set(args.state, spilled);
      }
      const results = spilled;
      const maySpill = args.messages.some(message =>
        message.content.parts.some(part => {
          if (part.type !== 'tool-invocation' || part.toolInvocation.state !== 'result') return false;
          return (
            !pagedRead.test(part.toolInvocation.toolName) &&
            JSON.stringify(part.toolInvocation.result)?.length >= spillThreshold
          );
        }),
      );
      if (maySpill || results.size) {
        tools[spillName] = createTool({
          id: spillName,
          inputSchema: input,
          description:
            'Read the next page of a large tool result by the id included in its preview. Use nextOffset to continue.',
          execute: async ({ id, offset }) => {
            const text = results.get(id);
            if (text === undefined) return { error: 'This result is unavailable in the current conversation request.' };
            const start = offset > 0 && /[\uDC00-\uDFFF]/.test(text.charAt(offset)) ? offset - 1 : offset;
            let end = start + pageSize;
            if (/[\uDC00-\uDFFF]/.test(text.charAt(end))) end++;
            return { text: text.slice(start, end), nextOffset: end < text.length ? end : null };
          },
        });
        if (activeTools && !activeTools.includes(spillName)) activeTools.push(spillName);
      }

      args.messageList.clearSystemMessages(tag);
      if (/\]\(\/storage\/download\?path=/.test(request)) {
        args.messageList.addSystem(
          'A Markdown link labeled @filename with /storage/download?path= identifies an existing file in the authenticated workspace. Decode its path parameter and use the workspace file tools to open it. Avoid repeating the internal path in your response.',
          tag,
        );
      }
      const last = calls.at(-1);
      if (last && args.steps.at(-1)?.toolResults?.some(result => result.toolCallId === last.toolCallId)) {
        const key = JSON.stringify([last.toolName, canonical(last.input)]);
        let repeats = 0;
        for (let i = calls.length - 1; i >= 0; i--) {
          const call = calls[i]!;
          if (JSON.stringify([call.toolName, canonical(call.input)]) !== key) break;
          repeats++;
        }
        if ([3, 5, 8].includes(repeats)) {
          args.messageList.addSystem(
            `The same tool and arguments were just called ${repeats} times in succession. Check its most recent result. Continue with a different action, or report what is blocking progress.`,
            tag,
          );
        }
      }
      return { tools, ...(activeTools ? { activeTools } : {}) };
    },
    processLLMRequest(args: ProcessLLMRequestArgs) {
      const spilled = spilledByRun.get(args.state);
      if (!spilled) return;
      return {
        prompt: args.prompt.map(message => {
          if (message.role !== 'tool') return message;
          return {
            ...message,
            content: message.content.map(part => {
              if (part.type !== 'tool-result' || pagedRead.test(part.toolName)) return part;
              const output = part.output;
              // Preserve typed media blocks for vision-capable providers.
              if (output.type !== 'text' && output.type !== 'json') return part;
              const text = output.type === 'text' ? output.value : JSON.stringify(output.value);
              if (text.length < spillThreshold) return part;
              const id = createHash('sha256').update(part.toolCallId).update(text).digest('hex').slice(0, 32);
              if (!spilled.has(id) && spilled.size >= maxSpills) {
                return {
                  ...part,
                  output: {
                    type: 'text' as const,
                    value: text.slice(0, 1500) + '\n\n[Result exceeds the preview limit.]\n\n' + text.slice(-1500),
                  },
                };
              }
              spilled.set(id, text);
              const edge = 1_500;
              return {
                ...part,
                output: {
                  type: 'text' as const,
                  value: `${text.slice(0, edge)}\n\n[Large tool result. Read the full output with ${spillName} using id ${id} and offset 0.]\n\n${text.slice(-edge)}`,
                },
              };
            }),
          };
        }),
      };
    },
  };
}
