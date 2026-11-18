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
  uncached?: number;
  cacheRead?: number;
  cacheWrite?: number;
  reasoning?: number;
}

export interface ContextReading {
  sampledAt: number;
  route?: string;
  usedTokens: number;
  outputTokens?: number;
  breakdown?: { system: number; tools: number; messages: number };
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
    uncached: count(inputDetails.text),
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
  const main = mainLoopSpans(spans, root);
  const mainCalls = calls.filter(span => main.has(span.spanId));
  const stepSpans = spans.filter(span => main.has(span.spanId) && span.spanType === 'model_step');
  const steps = stepSpans.length
    ? new Set(
        stepSpans
          .filter(span => instant(span.endedAt) !== undefined)
          .map(span => {
            const index = isRecord(span.attributes) ? count(span.attributes.stepIndex) : undefined;
            return index === undefined ? span.spanId : String(index);
          }),
      ).size
    : mainCalls.filter(span => instant(span.endedAt) !== undefined).length;
  let llmMs = 0;
  let toolMs = 0;
  let ttftMs = 0;
  let ttftSteps = 0;
  for (const span of mainCalls) {
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
    if (span.spanType !== 'tool_call' || !main.has(span.spanId)) continue;
    const start = instant(span.startedAt);
    const end = instant(span.endedAt);
    if (start !== undefined && end !== undefined) toolMs += Math.max(0, end - start);
  }
  let decodeMs = 0;
  let decodeTokens = 0;
  for (const span of mainCalls) {
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
    steps,
    models: calls.map(modelUsage),
    llmMs,
    toolMs,
    ttftMs,
    ttftSteps,
    context: contextReading(mainCalls, spans),
    decodeMs,
    decodeTokens,
  };
}

export function totalTokens(models: ModelUsage[]): number | undefined {
  if (!models.length || models.some(model => model.input === undefined || model.output === undefined)) return undefined;
  return models.reduce((sum, model) => sum + (model.input ?? 0) + (model.output ?? 0), 0);
}

/** Interrupted calls may never report usage. Keep known counts as a lower bound. */
export function reportedModelUsage(models: ModelUsage[]) {
  const reported = models.filter(model => model.input !== undefined && model.output !== undefined);
  return { models: reported, partial: reported.length !== models.length };
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

export function exactTokens(value: number, minimum = false): string {
  return `${minimum ? '≥ ' : ''}${new Intl.NumberFormat('en').format(value)} tok`;
}

export function uncachedTokens(usage: ModelUsage): number | undefined {
  if (usage.uncached !== undefined) return count(usage.uncached);
  if (usage.input === undefined || usage.cacheRead === undefined || usage.cacheWrite === undefined) return undefined;
  return count(usage.input - usage.cacheRead - usage.cacheWrite);
}

/** Main-loop lifecycle only; sidecars remain billable but cannot create turns or steps. */
function mainLoopSpans(spans: ChatSpan[], root?: ChatSpan): Set<string> {
  const attributes = isRecord(root?.attributes) ? root.attributes : {};
  const firstChunk = instant(attributes.completionStartTime);
  const generations = spans.filter(span => span.spanType === 'model_generation');
  const generation =
    generations.find(
      span => isRecord(span.metadata) && span.metadata.agentMainLoop === true && span.parentSpanId === root?.spanId,
    ) ??
    (firstChunk === undefined
      ? undefined
      : generations.find(
          span => isRecord(span.attributes) && instant(span.attributes.completionStartTime) === firstChunk,
        )) ??
    generations
      .filter(span => span.parentSpanId === root?.spanId)
      .sort((a, b) => (instant(a.startedAt) ?? 0) - (instant(b.startedAt) ?? 0))[0];
  const byId = new Map(spans.map(span => [span.spanId, span]));
  return new Set(
    spans
      .filter(span => {
        const visited = new Set<string>();
        let current: ChatSpan | undefined = span;
        while (current && !visited.has(current.spanId)) {
          visited.add(current.spanId);
          if (isRecord(current.metadata) && current.metadata.auxiliary) return false;
          if (current.spanType === 'model_generation') return current.spanId === generation?.spanId;
          if (current.spanType === 'agent_run') return !generation && current.spanId === root?.spanId;
          current = current.parentSpanId ? byId.get(current.parentSpanId) : undefined;
        }
        return false;
      })
      .map(span => span.spanId),
  );
}

/** Provider occupancy and separately labelled server estimates for that same request. */
function contextReading(calls: ChatSpan[], spans: ChatSpan[]): ContextReading | undefined {
  const latest = [...calls].sort((a, b) => (instant(b.startedAt) ?? 0) - (instant(a.startedAt) ?? 0))[0];
  if (!latest) return undefined;
  const usage = modelUsage(latest);
  const sampledAt = instant(latest.startedAt);
  if (sampledAt === undefined || usage.input === undefined) return undefined;
  const byId = new Map(spans.map(span => [span.spanId, span]));
  const visited = new Set<string>();
  let current: ChatSpan | undefined = latest;
  let breakdown: ContextReading['breakdown'];
  while (current && !visited.has(current.spanId)) {
    visited.add(current.spanId);
    const value = isRecord(current.metadata) ? current.metadata.contextBreakdown : undefined;
    if (isRecord(value) && value.method === 'mastra-token-counter') {
      const system = count(value.system);
      const tools = count(value.tools);
      const messages = count(value.messages);
      if (system !== undefined && tools !== undefined && messages !== undefined)
        breakdown = { system, tools, messages };
      break;
    }
    // Never borrow estimates from another request in this generation.
    if (current.spanType === 'model_step') break;
    current = current.parentSpanId ? byId.get(current.parentSpanId) : undefined;
  }
  return { sampledAt, route: usage.route, usedTokens: usage.input, outputTokens: usage.output, breakdown };
}

/** Preserve unknown fields when merging repeated calls to the same route. */
export function groupModelUsage(models: ModelUsage[]): ModelUsage[] {
  const groups = new Map<string | undefined, ModelUsage>();
  const fields = ['input', 'output', 'uncached', 'cacheRead', 'cacheWrite', 'reasoning'] as const;
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
