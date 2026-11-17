// DSH pressure/retention/checkpoint semantics adapted to Mastra processor hooks.
// Full transcript stays in memory storage; only the provider prompt is projected.
// See THIRD_PARTY_NOTICES.md for attribution and license.
import { createHash } from 'node:crypto';
import type {
  Processor,
  ProcessInputStepArgs,
  ProcessLLMRequestArgs,
  ProcessOutputStepArgs,
  ProcessAPIErrorArgs,
  ProcessLLMResponseArgs,
} from '@mastra/core/processors';
import type { MastraCompositeStore } from '@mastra/core/storage';
import { SpanType } from '@mastra/core/observability';
import { isStandardSchemaWithJSON, standardSchemaToJSONSchema } from '@mastra/core/schema';
import { z } from 'zod';
import { ModelHubGateway } from './modelhub-gateway.ts';
import { contextPolicy } from './context-policy.ts';
import { CHECKPOINT_PREAMBLE, COMPACTION_INSTRUCTION } from './compaction-prompt.ts';

type ProviderPrompt = Parameters<
  Awaited<ReturnType<ModelHubGateway['resolveLanguageModel']>>['doGenerate']
>[0]['prompt'];
type Prompt = ProcessLLMRequestArgs['prompt'];
type Message = Prompt[number];
type Json = Extract<Extract<Message, { role: 'tool' }>['content'][number]['output'], { type: 'json' }>['value'];
const routeSchema = z.object({
  modelId: z.string(),
  level: z.string().optional(),
});
const checkpointSchema = z.object({
  version: z.number().int().positive(),
  covered: z.number().int().positive(),
  digest: z.string(),
  summary: z.string().min(1),
});
const savedSchema = z.object({
  checkpoint: checkpointSchema.optional(),
  lastRoute: routeSchema.optional(),
  measurement: z
    .object({
      route: z.string(),
      input: z.number().nonnegative(),
      estimate: z.number().nonnegative(),
      epoch: z.number().int().nonnegative().default(0),
    })
    .optional(),
});
const key = 'dshContext';
const recordSchema = z.record(z.string(), z.unknown());
const record = (value: unknown) => recordSchema.safeParse(value).data ?? {};
const fingerprint = (messages: Prompt) => createHash('sha256').update(JSON.stringify(messages)).digest('hex');
const checkpointMessage = (summary: string): Message => ({
  role: 'user',
  content: [
    {
      type: 'text',
      text: `${CHECKPOINT_PREAMBLE}\n\n<compacted-summary>\n${summary}\n</compacted-summary>`,
    },
  ],
});

// DSH fixed-density pressure pricing (4 chars/token, 4 tokens/block and role).
// This internal admission estimate is never used for the displayed context occupancy.
function price(message: Message): number {
  if (typeof message.content === 'string') return 4 + Math.ceil(message.content.length / 4);
  return (
    4 +
    message.content.reduce((sum, block) => {
      if ('text' in block && typeof block.text === 'string') return sum + 4 + Math.ceil(block.text.length / 4);
      return sum + 4 + Math.ceil(JSON.stringify(block).length / 4);
    }, 0)
  );
}
const pricePrompt = (prompt: Prompt) => prompt.reduce((sum, message) => sum + price(message), 0);

function pruneValue(value: Json): Json {
  if (typeof value === 'string') {
    const chars = Array.from(value);
    return chars.length > 8192
      ? `${chars.slice(0, 4096).join('')}\n\n[... tool result middle pruned ...]\n\n${chars.slice(-1024).join('')}`
      : value;
  }
  if (Array.isArray(value)) return value.map(pruneValue);
  if (value && typeof value === 'object') {
    if (['media', 'image', 'file', 'file-data', 'image-data'].includes(String(value.type))) return value;
    return Object.fromEntries(
      Object.entries(value).map(([name, item]) => [
        name,
        item === undefined || ['data', 'url', 'base64'].includes(name) ? item : pruneValue(item),
      ]),
    );
  }
  return value;
}
function pruneTools(prompt: Prompt): Prompt {
  return prompt.map(message => {
    if (message.role !== 'tool') return message;
    return {
      ...message,
      content: message.content.map(block => {
        if (block.output.type === 'text')
          return {
            ...block,
            output: {
              ...block.output,
              value: String(pruneValue(block.output.value)),
            },
          };
        if (block.output.type === 'content')
          return {
            ...block,
            output: {
              ...block.output,
              value: block.output.value.map(part =>
                part.type === 'text' ? { ...part, text: String(pruneValue(part.text)) } : part,
              ),
            },
          };
        if (block.output.type === 'json')
          return {
            ...block,
            output: { ...block.output, value: pruneValue(block.output.value) },
          };
        return block;
      }),
    };
  });
}

/** Keep the recent tail and latest user request, moving the cut backward across open tool pairs. */
function selectCut(messages: Prompt, retain: number, force: boolean): number {
  let cut = messages.length;
  let tokens = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    cut = i;
    tokens += price(messages[i]);
    if (tokens >= retain || force) break;
  }
  let latestUser = -1;
  for (let i = messages.length - 1; i >= 0; i--)
    if (messages[i].role === 'user') {
      latestUser = i;
      break;
    }
  if (latestUser >= 0) cut = Math.min(cut, latestUser);
  const open = new Set<string>();
  let balanced = 0;
  for (let i = 0; i < cut; i++) {
    const message = messages[i];
    if (typeof message.content !== 'string')
      for (const block of message.content) {
        if (block.type === 'tool-call') open.add(block.toolCallId);
        if (block.type === 'tool-result') open.delete(block.toolCallId);
      }
    if (!open.size) balanced = i + 1;
  }
  return balanced;
}

function providerPrompt(prompt: Prompt): ProviderPrompt {
  const output = (value: Extract<Message, { role: 'tool' }>['content'][number]['output']) => {
    if (value.type !== 'content') return value;
    return {
      ...value,
      value: value.value.map(block =>
        block.type === 'media'
          ? {
              type: 'file-data' as const,
              data: block.data,
              mediaType: block.mediaType,
            }
          : block,
      ),
    };
  };
  return prompt.map(message => {
    if (message.role === 'tool')
      return {
        ...message,
        content: message.content.map(block => ({
          ...block,
          output: output(block.output),
        })),
      };
    if (message.role === 'assistant')
      return {
        ...message,
        content: message.content.map(block =>
          block.type === 'tool-result' ? { ...block, output: output(block.output) } : block,
        ),
      };
    return message;
  });
}

export class ContextCompaction implements Processor {
  readonly id = 'context-compaction';
  readonly name = 'Context checkpoint compaction';
  #gateway: ModelHubGateway;
  #storage: MastraCompositeStore;
  #contexts = new WeakMap<Record<string, unknown>, ProcessInputStepArgs>();
  constructor(options: { gateway: ModelHubGateway; storage: MastraCompositeStore }) {
    this.#gateway = options.gateway;
    this.#storage = options.storage;
  }
  processInputStep(args: ProcessInputStepArgs) {
    this.#contexts.set(args.state, args);
    return {
      modelSettings: {
        ...args.modelSettings,
        maxOutputTokens: Math.min(args.modelSettings?.maxOutputTokens ?? 8192, 8192),
      },
    };
  }
  async #scope(args: ProcessLLMRequestArgs | ProcessOutputStepArgs | ProcessLLMResponseArgs) {
    const list = 'messageList' in args ? args.messageList : this.#contexts.get(args.state)?.messageList;
    const info = list?.serialize().memoryInfo;
    if (!info?.threadId || !info.resourceId) throw new Error('Context compaction requires an owned memory thread');
    const store = await this.#storage.getStore('memory');
    if (!store) throw new Error('Context checkpoint storage is unavailable');
    const thread = await store.getThreadById({
      threadId: info.threadId,
      resourceId: info.resourceId,
    });
    if (!thread || thread.resourceId !== info.resourceId)
      throw new Error('Context checkpoint thread ownership mismatch');
    const parsed = savedSchema.safeParse(thread.metadata?.[key]);
    return { store, thread, saved: parsed.success ? parsed.data : {} };
  }
  async #route(args: ProcessLLMRequestArgs | ProcessOutputStepArgs | ProcessLLMResponseArgs) {
    const context = this.#contexts.get(args.state);
    const catalog = await this.#gateway.catalog();
    const product = catalog.free_chat_models.find(
      product => product.id === ('model' in args ? args.model : context?.model)?.modelId,
    );
    if (!product) throw new Error('Context model is not in the ModelHub catalog');
    const level = record(context?.providerOptions?.altflow).reasoningLevel;
    const option = product.thinking_options.find(option => option.level === (level ?? product.default_thinking_level));
    if (!option) throw new Error('Unsupported context reasoning route');
    const capacity = (await this.#gateway.modelInfo())[option.target];
    return {
      modelId: product.id,
      level: option.level,
      policy: contextPolicy(capacity),
    };
  }
  #tools(args: ProcessLLMRequestArgs) {
    const context = this.#contexts.get(args.state);
    return Object.entries(context?.tools ?? {}).map(([name, value]) => {
      const tool = record(value);
      const schema = tool.inputSchema ?? tool.parameters;
      const inputSchema = isStandardSchemaWithJSON(schema)
        ? standardSchemaToJSONSchema(schema)
        : (record(schema).jsonSchema ?? schema);
      return {
        type: 'function' as const,
        name,
        description: typeof tool.description === 'string' ? tool.description : undefined,
        inputSchema: record(inputSchema),
      };
    });
  }
  async processLLMRequest(args: ProcessLLMRequestArgs) {
    const { store, thread, saved } = await this.#scope(args);
    const route = await this.#route(args);
    const routeKey = `${route.modelId}/${route.level}`;
    const tools = this.#tools(args);
    const overhead = tools.length ? Math.ceil(JSON.stringify(tools).length / 4) + 4 : 0;
    const system = args.prompt.filter(message => message.role === 'system');
    const original = args.prompt.filter(message => message.role !== 'system');
    const previous = saved.checkpoint;
    const applied =
      previous &&
      original.length >= previous.covered &&
      fingerprint(original.slice(0, previous.covered)) === previous.digest;
    let messages = applied ? [checkpointMessage(previous.summary), ...original.slice(previous.covered)] : original;
    let prompt = [...system, ...messages];
    const estimate = () => pricePrompt(prompt) + overhead;
    const pressure = () =>
      saved.measurement?.route === routeKey && saved.measurement.epoch === (applied ? previous.version : 0)
        ? Math.max(estimate(), saved.measurement.input + estimate() - saved.measurement.estimate)
        : estimate();
    const force = args.state.forceCompaction === true;
    args.state.forceCompaction = false;
    if (force || pressure() >= route.policy.threshold) {
      prompt = pruneTools(prompt);
      messages = prompt.filter(message => message.role !== 'system');
      if (force || pressure() >= route.policy.threshold) {
        const cut = selectCut(messages, route.policy.retain, force);
        if (cut > 0 && !(applied && cut === 1)) {
          const covered = (applied ? previous.covered - 1 : 0) + cut;
          const prefix = messages.slice(0, cut);
          const summaryRoute = saved.lastRoute ?? route;
          const model = await this.#gateway.resolveSummaryModel(summaryRoute.modelId);
          let summary: string | undefined;
          for (let attempt = 0; attempt < 2; attempt++) {
            args.abortSignal?.throwIfAborted();
            const span = args.tracingContext?.currentSpan?.createChildSpan({
              name: 'Context checkpoint summary',
              type: SpanType.MODEL_INFERENCE,
              attributes: { model: summaryRoute.modelId, provider: 'altflow' },
              metadata: { auxiliary: 'compaction' },
            });
            try {
              const summaryPrompt: Prompt = [
                ...system,
                ...prefix,
                {
                  role: 'user',
                  content: [{ type: 'text', text: COMPACTION_INSTRUCTION }],
                },
              ];
              const summaryProduct = (await this.#gateway.catalog()).free_chat_models.find(
                product => product.id === summaryRoute.modelId,
              );
              const summaryTarget = summaryProduct?.thinking_options.find(
                option => option.level === summaryRoute.level,
              )?.target;
              const summaryCapacity = summaryTarget ? (await this.#gateway.modelInfo())[summaryTarget] : undefined;
              const summaryWindow = contextPolicy(summaryCapacity).window;
              const summaryOutput = Math.min(65536, summaryWindow - pricePrompt(summaryPrompt) - overhead);
              if (summaryOutput <= 0) throw new Error('Summary request exceeds its source model capacity');
              const result = await model.doGenerate({
                prompt: providerPrompt(summaryPrompt),
                tools,
                toolChoice: { type: 'none' },
                maxOutputTokens: summaryOutput,
                providerOptions: {
                  altflow: {
                    reasoningLevel: summaryRoute.level ?? route.level,
                  },
                },
                abortSignal: args.abortSignal,
              });
              span?.end({
                attributes: {
                  usage: {
                    inputTokens: result.usage.inputTokens.total,
                    outputTokens: result.usage.outputTokens.total,
                    inputDetails: {
                      text: result.usage.inputTokens.noCache,
                      cacheRead: result.usage.inputTokens.cacheRead,
                      cacheWrite: result.usage.inputTokens.cacheWrite,
                    },
                    outputDetails: {
                      text: result.usage.outputTokens.text,
                      reasoning: result.usage.outputTokens.reasoning,
                    },
                  },
                },
              });
              const text = result.content
                .filter(block => block.type === 'text')
                .map(block => block.text)
                .join('')
                .trim();
              const replacement = checkpointMessage(text);
              if (result.finishReason.unified !== 'stop' || !text || price(replacement) >= pricePrompt(prefix))
                continue;
              const candidate = [...system, replacement, ...messages.slice(cut)];
              if (pricePrompt(candidate) + overhead >= route.policy.threshold) continue;
              summary = text;
              break;
            } catch (error) {
              span?.error({
                error: error instanceof Error ? error : new Error('Checkpoint summary failed'),
              });
              args.abortSignal?.throwIfAborted();
            }
          }
          if (summary) {
            args.abortSignal?.throwIfAborted();
            const checkpoint = {
              version: (previous?.version ?? 0) + 1,
              covered,
              digest: fingerprint(original.slice(0, covered)),
              summary,
            };
            await store.updateThreadMetadata({
              id: thread.id,
              resourceId: thread.resourceId,
              update: current => {
                args.abortSignal?.throwIfAborted();
                const latest = savedSchema.safeParse(current.metadata?.[key]).data;
                if ((latest?.checkpoint?.version ?? 0) !== (previous?.version ?? 0))
                  throw new Error('Context changed while compacting');
                return {
                  ...current.metadata,
                  [key]: { ...latest, checkpoint, measurement: undefined },
                };
              },
            });
            prompt = [...system, checkpointMessage(summary), ...messages.slice(cut)];
            await args.sendSignal?.({
              type: 'reactive',
              tagName: 'system-reminder',
              contents: 'Earlier conversation has been compacted into a checkpoint.',
              metadata: {
                type: 'context-compaction',
                message: '已压缩早期上下文',
              },
            });
          } else throw new Error('Context could not be compacted safely below the pressure threshold');
        } else if (force) throw new Error('Context overflow has no balanced history to compact');
      }
    }
    if (pricePrompt(prompt) + overhead >= route.policy.window - route.policy.output) {
      throw new Error('Current request exceeds the context budget; shorten the current message or attachments');
    }
    args.state.contextEstimate = pricePrompt(prompt) + overhead;
    return { prompt };
  }
  async processOutputStep(args: ProcessOutputStepArgs) {
    const { store, thread } = await this.#scope(args);
    const route = await this.#route(args);
    const input = args.usage?.inputTokens;
    const estimate = args.state.contextEstimate;
    await store.updateThreadMetadata({
      id: thread.id,
      resourceId: thread.resourceId,
      update: current => {
        const previous = savedSchema.safeParse(current.metadata?.[key]).data ?? {};
        return {
          ...current.metadata,
          [key]: {
            ...previous,
            lastRoute: { modelId: route.modelId, level: route.level },
            ...(typeof input === 'number' && typeof estimate === 'number'
              ? {
                  measurement: {
                    route: `${route.modelId}/${route.level}`,
                    input,
                    estimate,
                    epoch: previous.checkpoint?.version ?? 0,
                  },
                }
              : {}),
          },
        };
      },
    });
    return args.messageList;
  }
  processAPIError(args: ProcessAPIErrorArgs) {
    const error = record(args.error);
    const message = `${args.error instanceof Error ? args.error.message : ''} ${typeof error.responseBody === 'string' ? error.responseBody : ''}`;
    if (
      args.state.contextOverflowRetried ||
      !/context_length_exceeded|maximum context length|context window.*exceed|too many tokens/i.test(message)
    )
      return;
    args.state.contextOverflowRetried = true;
    args.state.forceCompaction = true;
    return { retry: true };
  }
}
