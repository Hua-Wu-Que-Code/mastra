// DSH parity: the requested metadata pills intentionally retain its middle-dot separators.
/* eslint-disable playground-ui/no-text-separators */
import { useState } from 'react';
import { useChatPreferences } from '../preferences/chat-preferences-context';
import {
  cacheHit,
  compactTokens,
  exactTokens,
  groupModelUsage,
  reportedModelUsage,
  totalTokens,
  uncachedTokens,
} from './chat-metrics';
import { useChatMetrics, usePartialMetrics } from './chat-metrics-context';
import { ContextUsage } from './context-usage';
import { StatCard, StatRows } from './stat-card';
import { DshDatabase } from '@/ds/icons/dsh/DshDatabase';
import { DshGauge } from '@/ds/icons/dsh/DshGauge';
import { t, useLocale } from '@/lib/i18n';

function duration(ms: number): string {
  if (ms < 60_000) return t('{seconds}s', { seconds: Math.round(ms / 100) / 10 });
  const seconds = Math.round(ms / 1000);
  return t('{minutes}m {seconds}s', { minutes: Math.floor(seconds / 60), seconds: seconds % 60 });
}

export function ChatSessionStats({ contextWindow, route }: { contextWindow?: number; route?: string }) {
  useLocale();
  const [card, setCard] = useState<string>();
  const { preferences } = useChatPreferences();
  const metrics = useChatMetrics();
  const incomplete = usePartialMetrics();
  const models = metrics.flatMap(metric => metric.models);
  const reported = reportedModelUsage(models);
  const partial = incomplete || reported.partial;
  const usage = groupModelUsage(reported.models.map(model => ({ ...model, route: undefined })))[0];
  const total = totalTokens(reported.models);
  const hit = partial ? undefined : cacheHit(models);
  const decodeMs = metrics.reduce((sum, metric) => sum + metric.decodeMs, 0);
  const decoded = metrics.reduce((sum, metric) => sum + metric.decodeTokens, 0);
  const speed = decodeMs > 0 ? Math.round((decoded / decodeMs) * 1000) : undefined;
  const steps = metrics.reduce((sum, metric) => sum + metric.steps, 0);
  const llmMs = metrics.reduce((sum, metric) => sum + metric.llmMs, 0);
  const toolMs = metrics.reduce((sum, metric) => sum + metric.toolMs, 0);
  const ttftMs = metrics.reduce((sum, metric) => sum + metric.ttftMs, 0);
  const ttftSteps = metrics.reduce((sum, metric) => sum + metric.ttftSteps, 0);
  const counts = t('{rounds} turns {steps} steps', {
    rounds: metrics.filter(metric => metric.steps > 0).length,
    steps,
  });
  const rows = [
    ...(llmMs > 0 ? [{ label: t('Model time'), value: duration(llmMs) }] : []),
    ...(toolMs > 0 ? [{ label: t('Tool time'), value: duration(toolMs) }] : []),
    ...(ttftSteps > 0 ? [{ label: t('Average time to first token (TTFT)'), value: duration(ttftMs / ttftSteps) }] : []),
    ...(speed !== undefined ? [{ label: t('Output speed (TPS)'), value: t('{speed} tok/s', { speed }) }] : []),
  ];
  const uncached = usage && uncachedTokens(usage);
  const usageRows = [
    { label: t('Cache hit'), value: hit === undefined ? t('Not provided') : `${hit}%` },
    { label: t('Uncached input'), value: uncached === undefined ? t('Not provided') : exactTokens(uncached, partial) },
    ...(usage?.cacheRead !== undefined
      ? [{ label: t('Cache read'), value: exactTokens(usage.cacheRead, partial) }]
      : []),
    ...(usage?.cacheWrite ? [{ label: t('Cache write'), value: exactTokens(usage.cacheWrite, partial) }] : []),
    {
      label: t('Output tokens'),
      value: usage?.output === undefined ? t('Not provided') : exactTokens(usage.output, partial),
    },
  ];
  const latest = metrics
    .map(metric => metric.context)
    .filter(context => context !== undefined)
    .sort((a, b) => b.sampledAt - a.sampledAt)[0];
  return (
    <div
      className="flex min-w-0 flex-wrap items-center justify-center gap-x-2 gap-y-0 text-caption text-muted-foreground"
      aria-label={t('Conversation statistics')}
    >
      <StatCard
        icon={<DshGauge />}
        label={
          <>
            {counts}
            <> · {t('{speed} tok/s', { speed: speed ?? '—' })}</>
          </>
        }
        title={t('Conversation statistics')}
        value={counts}
        open={card === 'activity'}
        onOpenChange={open => setCard(open ? 'activity' : undefined)}
      >
        {incomplete && (
          <p className="mb-3 text-caption text-muted-foreground">{t('Statistics include only available records.')}</p>
        )}
        {rows.length ? (
          <StatRows rows={rows} />
        ) : (
          <span className="text-caption text-muted-foreground">{t('Timing is not available for these requests.')}</span>
        )}
      </StatCard>
      <StatCard
        icon={<DshDatabase />}
        label={
          <>
            {partial && total !== undefined && '≥ '}
            {t('{tokens} tok', { tokens: total === undefined ? '—' : compactTokens(total) })}
            {` · ${t('Cache hit {percent}%', { percent: hit ?? '—' })}`}
          </>
        }
        title={t('Token usage')}
        value={total === undefined ? t('Not provided') : exactTokens(total, partial)}
        open={card === 'usage'}
        onOpenChange={open => setCard(open ? 'usage' : undefined)}
      >
        {partial && (
          <p className="mb-3 text-caption text-muted-foreground">{t('Statistics include only available records.')}</p>
        )}
        <StatRows rows={usageRows} />
      </StatCard>
      {preferences.showContextUsage && (
        <ContextUsage
          reading={latest}
          capacity={contextWindow}
          route={route}
          open={card === 'context'}
          onOpenChange={open => setCard(open ? 'context' : undefined)}
        />
      )}
    </div>
  );
}
