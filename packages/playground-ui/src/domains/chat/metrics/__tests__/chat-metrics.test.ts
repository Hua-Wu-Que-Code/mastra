import { describe, expect, it } from 'vitest';
import { cacheHit, groupModelUsage, projectRunMetrics, totalTokens, uncachedTokens } from '../chat-metrics';
import { span, trace } from './fixtures/trace';

const usage = { inputTokens: 1000, outputTokens: 200, inputDetails: { cacheRead: 800 } };
describe('durable conversation accounting', () => {
  it('counts leaf calls once despite generation ancestors and duplicate span rows', () => {
    const inference = span({
      spanId: 'call',
      parentSpanId: 'step',
      spanType: 'model_inference',
      attributes: { usage, completionStartTime: '2026-11-16T07:54:01Z' },
    });
    const metrics = projectRunMetrics(
      trace([
        span(),
        span({ spanId: 'generation', parentSpanId: 'root', spanType: 'model_generation', attributes: { usage } }),
        span({ spanId: 'step', parentSpanId: 'generation', spanType: 'model_step' }),
        inference,
        inference,
      ]),
    );
    expect(totalTokens(metrics.models)).toBe(1200);
    expect(metrics.steps).toBe(1);
    expect(metrics.llmMs).toBe(3000);
    expect(metrics.ttftMs).toBe(1000);
    expect(metrics.decodeMs).toBe(2000);
    expect(metrics.decodeTokens).toBe(200);
  });
  it('keeps legacy generation usage when no inference span exists', () => {
    const metrics = projectRunMetrics(
      trace([
        span(),
        span({ spanId: 'generation', parentSpanId: 'root', spanType: 'model_generation', attributes: { usage } }),
      ]),
    );
    expect(totalTokens(metrics.models)).toBe(1200);
    expect(metrics.decodeMs).toBe(0);
  });
  it('preserves unknown usage and never invents decoding time', () => {
    const metrics = projectRunMetrics(
      trace([
        span(),
        span({
          spanId: 'call',
          spanType: 'model_inference',
          parentSpanId: 'root',
          attributes: { usage: { inputTokens: 100, outputTokens: NaN } },
        }),
      ]),
    );
    expect(totalTokens(metrics.models)).toBeUndefined();
    expect(cacheHit(metrics.models)).toBeUndefined();
    expect(metrics.decodeTokens).toBe(0);
    expect(metrics.decodeMs).toBe(0);
    expect(uncachedTokens({ input: 1000, cacheRead: 800 })).toBeUndefined();
    expect(uncachedTokens({ input: 1000, cacheRead: 800, cacheWrite: 0 })).toBe(200);
  });
  it('uses logical outcomes instead of interpreting aborted runs as successful', () => {
    expect(projectRunMetrics(trace([span({ outcome: 'aborted' })])).outcome).toBe('aborted');
  });
  it('groups model routes while preserving missing cache data', () => {
    const grouped = groupModelUsage([
      { route: 'a', input: 100, output: 5, cacheRead: 50 },
      { route: 'a', input: 200, output: 6 },
    ]);
    expect(grouped).toEqual([
      { route: 'a', input: 300, output: 11, cacheRead: undefined, cacheWrite: undefined, reasoning: undefined },
    ]);
    expect(cacheHit(grouped)).toBeUndefined();
  });
  it('keeps partial cache hits below 100 percent and gives turn cards one decimal', () => {
    expect(cacheHit([{ input: 1000, cacheRead: 999 }])).toBe('99.9');
    expect(cacheHit([{ input: 1000, cacheRead: 944 }], 1)).toBe('94.4');
    expect(cacheHit([{ input: 1000, cacheRead: 1000 }])).toBe('100');
  });
  it('uses the latest recorded input for context instead of cumulative usage or prompt estimates', () => {
    const metrics = projectRunMetrics(
      trace([
        span(),
        span({ spanId: 'first', spanType: 'model_inference', attributes: { usage } }),
        span({
          spanId: 'last',
          spanType: 'model_inference',
          startedAt: '2026-11-16T07:54:01Z',
          input: [
            { role: 'system', content: '12345678' },
            { role: 'user', content: '1234' },
          ],
          attributes: {
            provider: 'altflow.chat',
            model: 'model',
            usage: { inputTokens: 2000, outputTokens: 100 },
            tools: [],
          },
        }),
      ]),
    );
    expect(totalTokens(metrics.models)).toBe(3300);
    expect(metrics.context).toMatchObject({
      usedTokens: 2000,
      outputTokens: 100,
      route: 'altflow/model',
    });
  });
  it('samples the main agent loop instead of a later title-generation sidecar', () => {
    const metrics = projectRunMetrics(
      trace([
        span({ attributes: { completionStartTime: '2026-11-16T07:54:01Z' } }),
        span({
          spanId: 'main',
          parentSpanId: 'root',
          spanType: 'model_generation',
          attributes: { completionStartTime: '2026-11-16T07:54:01Z' },
        }),
        span({ spanId: 'call', parentSpanId: 'main', spanType: 'model_inference', attributes: { usage } }),
        span({
          spanId: 'title',
          parentSpanId: 'root',
          spanType: 'model_generation',
          startedAt: '2026-11-16T07:54:03Z',
          attributes: { usage: { inputTokens: 100, outputTokens: 10 } },
        }),
      ]),
    );
    expect(metrics.context?.usedTokens).toBe(1000);
    // Sidecar costs are still real provider costs and belong in the token total.
    expect(totalTokens(metrics.models)).toBe(1310);
  });
});
