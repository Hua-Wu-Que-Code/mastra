// DSH parity: the requested metadata pills intentionally retain its middle-dot separators.
/* eslint-disable playground-ui/no-text-separators */
import { useState } from 'react';
import { cacheHit, compactTokens, exactTokens, groupModelUsage, totalTokens, uncachedTokens } from './chat-metrics';
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
  const metrics = useChatMetrics();
  const incomplete = usePartialMetrics();
  if (!metrics.length) return null;
  const models = metrics.flatMap(metric => metric.models);
  const usage = groupModelUsage(models.map(model => ({ ...model, route: undefined })))[0];
  const total = totalTokens(models);
  const hit = cacheHit(models);
  const decodeMs = metrics.reduce((sum, metric) => sum + metric.decodeMs, 0);
  const decoded = metrics.reduce((sum, metric) => sum + metric.decodeTokens, 0);
  const speed = decodeMs > 0 ? Math.round((decoded / decodeMs) * 1000) : undefined;
  const steps = metrics.reduce((sum, metric) => sum + metric.steps, 0);
  const llmMs = metrics.reduce((sum, metric) => sum + metric.llmMs, 0);
  const toolMs = metrics.reduce((sum, metric) => sum + metric.toolMs, 0);
  const ttftMs = metrics.reduce((sum, metric) => sum + metric.ttftMs, 0);
  const ttftSteps = metrics.reduce((sum, metric) => sum + metric.ttftSteps, 0);
  const counts = t('{rounds} turns {steps} steps', { rounds: metrics.length, steps });
  const rows = [
    ...(llmMs > 0 ? [{ label: t('Model time'), value: duration(llmMs) }] : []),
    ...(toolMs > 0 ? [{ label: t('Tool time'), value: duration(toolMs) }] : []),
    ...(ttftSteps > 0 ? [{ label: t('Average time to first token (TTFT)'), value: duration(ttftMs / ttftSteps) }] : []),
    ...(speed !== undefined ? [{ label: t('Output speed (TPS)'), value: t('{speed} tok/s', { speed }) }] : []),
  ];
  const uncached = usage && uncachedTokens(usage);
  const usageRows = [
    ...(hit !== undefined ? [{ label: t('Cache hit'), value: `${hit}%` }] : []),
    ...(uncached !== undefined && uncached >= 0 ? [{ label: t('Uncached input'), value: exactTokens(uncached) }] : []),
    ...(usage?.cacheRead !== undefined ? [{ label: t('Cache read'), value: exactTokens(usage.cacheRead) }] : []),
    ...(usage?.cacheWrite ? [{ label: t('Cache write'), value: exactTokens(usage.cacheWrite) }] : []),
    ...(usage?.output !== undefined ? [{ label: t('Output tokens'), value: exactTokens(usage.output) }] : []),
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
            {speed !== undefined && <> · {t('{speed} tok/s', { speed })}</>}
          </>
        }
        title={t('Execution statistics')}
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
      {total !== undefined && (
        <StatCard
          icon={<DshDatabase />}
          label={
            <>
              {t('{tokens} tok', { tokens: compactTokens(total) })}
              {hit !== undefined && ` · ${t('Cache hit {percent}%', { percent: hit })}`}
            </>
          }
          title={t('Token usage')}
          value={exactTokens(total)}
          open={card === 'usage'}
          onOpenChange={open => setCard(open ? 'usage' : undefined)}
        >
          {incomplete && (
            <p className="mb-3 text-caption text-muted-foreground">{t('Statistics include only available records.')}</p>
          )}
          <StatRows rows={usageRows} />
        </StatCard>
      )}
      <ContextUsage
        reading={latest}
        capacity={contextWindow}
        route={route}
        open={card === 'context'}
        onOpenChange={open => setCard(open ? 'context' : undefined)}
      />
    </div>
  );
}
