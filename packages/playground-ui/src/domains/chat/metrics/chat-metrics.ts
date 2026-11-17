import type { MastraClient } from '@mastra/client-js';
import type { MastraDBMessage } from '@mastra/core/agent/message-list';
import { isRecord } from '../messages/signal-data';
import { formatCacheHitPercent } from './cache-hit-percent';

export type ChatTrace = Awaited<ReturnType<MastraClient['getTrace']>>;
type ChatSpan = ChatTrace['spans'][number];

export interface ModelUsage {
  route?: string;
  input?: number;
  output?: number;
  cacheRead?: number;
  cacheWrite?: number;
  reasoning?: number;
}

export interface ContextReading {
  sampledAt: number;
  route?: string;
  usedTokens: number;
  outputTokens?: number;
}

export interface RunMetrics {
  traceId: string;
  startedAt?: number;
  endedAt?: number;
  outcome?: string;
  steps: number;
  models: ModelUsage[];
  llmMs: number;
  toolMs: number;
  ttftMs: number;
  ttftSteps: number;
  context?: ContextReading;
  decodeMs: number;
  decodeTokens: number;
}

export function count(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
}

export function instant(value: unknown): number | undefined {
  if (!(value instanceof Date) && typeof value !== 'string') return undefined;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : undefined;
}

export function messageTraceId(message: MastraDBMessage): string | undefined {
  const value = message.content.metadata?.traceId;
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function modelUsage(span: ChatSpan): ModelUsage {
  const attributes = isRecord(span.attributes) ? span.attributes : {};
  const usage = isRecord(attributes.usage) ? attributes.usage : {};
  const inputDetails = isRecord(usage.inputDetails) ? usage.inputDetails : {};
  const outputDetails = isRecord(usage.outputDetails) ? usage.outputDetails : {};
  const model = typeof attributes.model === 'string' ? attributes.model : undefined;
  const provider =
    typeof attributes.provider === 'string'
      ? attributes.provider.replace(/\.(chat|responses|completion)$/, '')
      : undefined;
  return {
    route: provider && model ? `${provider}/${model}` : model,
    input: count(usage.inputTokens),
    output: count(usage.outputTokens),
    cacheRead: count(inputDetails.cacheRead),
    cacheWrite: count(inputDetails.cacheWrite),
    reasoning: count(outputDetails.reasoning),
  };
}

/** Only leaf provider calls count. Generation/step ancestors repeat their children's usage. */
function usageSpans(spans: ChatSpan[]): ChatSpan[] {
  const parentsWithInference = new Set<string>();
  const byId = new Map(spans.map(span => [span.spanId, span]));
  for (const span of spans) {
    if (span.spanType !== 'model_inference') continue;
    const visited = new Set<string>();
    let parent = span.parentSpanId;
    while (parent && !visited.has(parent)) {
      visited.add(parent);
      parentsWithInference.add(parent);
      parent = byId.get(parent)?.parentSpanId;
    }
  }
  return spans.filter(
    span =>
      span.spanType === 'model_inference' ||
      (span.spanType === 'model_generation' && !parentsWithInference.has(span.spanId)),
  );
}

/** Adapt DSH's turn accounting and decode-only throughput to Mastra's durable trace records. */
export function projectRunMetrics(trace: ChatTrace): RunMetrics {
  const spans = [...new Map(trace.spans.map(span => [span.spanId, span])).values()];
  const root = spans.find(span => span.parentSpanId === null && span.spanType === 'agent_run');
  const calls = usageSpans(spans);
  const steps = spans.filter(span => span.spanType === 'model_step').length;
  let llmMs = 0;
  let toolMs = 0;
  let ttftMs = 0;
  let ttftSteps = 0;
  for (const span of calls) {
    const start = instant(span.startedAt);
    const end = instant(span.endedAt);
    if (start !== undefined && end !== undefined) llmMs += Math.max(0, end - start);
    const attributes = isRecord(span.attributes) ? span.attributes : {};
    const first = instant(attributes.completionStartTime);
    if (start !== undefined && first !== undefined && first >= start) {
      ttftMs += first - start;
      ttftSteps++;
    }
  }
  for (const span of spans) {
    if (span.spanType !== 'tool_call') continue;
    const start = instant(span.startedAt);
    const end = instant(span.endedAt);
    if (start !== undefined && end !== undefined) toolMs += Math.max(0, end - start);
  }
  let decodeMs = 0;
  let decodeTokens = 0;
  for (const span of calls) {
    if (span.spanType !== 'model_inference') continue;
    const attributes = isRecord(span.attributes) ? span.attributes : {};
    const first = instant(attributes.completionStartTime);
    const end = instant(span.endedAt);
    const output = modelUsage(span).output;
    if (first === undefined || end === undefined || end <= first || output === undefined) continue;
    decodeMs += end - first;
    decodeTokens += output;
  }
  const attributes = isRecord(root?.attributes) ? root.attributes : {};
  return {
    traceId: trace.traceId,
    startedAt: instant(root?.startedAt),
    endedAt: instant(root?.endedAt),
    outcome:
      typeof root?.outcome === 'string'
        ? root.outcome
        : typeof attributes.finishReason === 'string'
          ? attributes.finishReason
          : root?.status,
    steps: steps || calls.length,
    models: calls.map(modelUsage),
    llmMs,
    toolMs,
    ttftMs,
    ttftSteps,
    context: contextReading(contextCalls(calls, spans, root)),
    decodeMs,
    decodeTokens,
  };
}

export function totalTokens(models: ModelUsage[]): number | undefined {
  if (!models.length || models.some(model => model.input === undefined || model.output === undefined)) return undefined;
  return models.reduce((sum, model) => sum + (model.input ?? 0) + (model.output ?? 0), 0);
}

export function cacheHit(models: ModelUsage[], decimalPlaces: 0 | 1 = 0): string | undefined {
  if (!models.length || models.some(model => model.input === undefined || model.cacheRead === undefined))
    return undefined;
  const input = models.reduce((sum, model) => sum + (model.input ?? 0), 0);
  const cached = models.reduce((sum, model) => sum + (model.cacheRead ?? 0), 0);
  return input > 0 && cached <= input ? (formatCacheHitPercent(cached, input, decimalPlaces) ?? undefined) : undefined;
}

export function compactTokens(value: number): string {
  // DSH uses integer K/M counts once the scaled value reaches three digits.
  const scaled = (number: number) => (number >= 100 ? Math.round(number) : Math.round(number * 10) / 10);
  if (value < 1000) return String(value);
  if (value < 1_000_000) return `${scaled(value / 1000)}K`;
  return `${scaled(value / 1_000_000)}M`;
}

export function exactTokens(value: number): string {
  return `${new Intl.NumberFormat('en').format(value)} tok`;
}

export function uncachedTokens(usage: ModelUsage): number | undefined {
  if (usage.input === undefined || usage.cacheRead === undefined || usage.cacheWrite === undefined) return undefined;
  return count(usage.input - usage.cacheRead - usage.cacheWrite);
}

/** Root first-chunk attribution identifies its own loop even when title/processor calls share the trace. */
function contextCalls(calls: ChatSpan[], spans: ChatSpan[], root?: ChatSpan): ChatSpan[] {
  const attributes = isRecord(root?.attributes) ? root.attributes : {};
  const firstChunk = instant(attributes.completionStartTime);
  // Older traces do not carry root attribution; preserve their latest-call fallback.
  if (firstChunk === undefined) return calls;
  const generation = spans.find(span => {
    const attributes = isRecord(span.attributes) ? span.attributes : {};
    return span.spanType === 'model_generation' && instant(attributes.completionStartTime) === firstChunk;
  });
  if (!generation) return [];
  const byId = new Map(spans.map(span => [span.spanId, span]));
  return calls.filter(span => {
    const visited = new Set<string>();
    let id: string | null | undefined = span.spanId;
    while (id && !visited.has(id)) {
      if (id === generation.spanId) return true;
      visited.add(id);
      id = byId.get(id)?.parentSpanId;
    }
    return false;
  });
}

/** Exact input occupancy from the latest main-loop provider request. Never estimate prompt components. */
function contextReading(calls: ChatSpan[]): ContextReading | undefined {
  const latest = [...calls].sort((a, b) => (instant(b.startedAt) ?? 0) - (instant(a.startedAt) ?? 0))[0];
  if (!latest) return undefined;
  const usage = modelUsage(latest);
  const sampledAt = instant(latest.startedAt);
  if (sampledAt === undefined || usage.input === undefined) return undefined;
  return { sampledAt, route: usage.route, usedTokens: usage.input, outputTokens: usage.output };
}

/** Preserve unknown fields when merging repeated calls to the same route. */
export function groupModelUsage(models: ModelUsage[]): ModelUsage[] {
  const groups = new Map<string | undefined, ModelUsage>();
  const fields = ['input', 'output', 'cacheRead', 'cacheWrite', 'reasoning'] as const;
  for (const model of models) {
    const previous = groups.get(model.route);
    if (!previous) {
      groups.set(model.route, { ...model });
      continue;
    }
    for (const key of fields) {
      const a = previous[key];
      const b = model[key];
      previous[key] = a === undefined || b === undefined ? undefined : a + b;
    }
  }
  return [...groups.values()];
}
