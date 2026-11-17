import type { ModelUsage } from './chat-metrics';
import { cacheHit, compactTokens, exactTokens, groupModelUsage, totalTokens, uncachedTokens } from './chat-metrics';
import { Popover, PopoverContent, PopoverTrigger } from '@/ds/components/Popover';
import { Txt } from '@/ds/components/Txt';
import { DshDatabase } from '@/ds/icons/dsh/DshDatabase';
import { t, useLocale } from '@/lib/i18n';

function UsageCount({ label, value }: { label: string; value?: number }) {
  if (value === undefined) return null;
  return (
    <div className="flex justify-between gap-6 text-caption text-muted-foreground">
      <span>{label}</span>
      <span className="shrink-0 tabular-nums">{exactTokens(value)}</span>
    </div>
  );
}

function ModelUsageRows({ usage }: { usage: ModelUsage }) {
  const { output, cacheRead, cacheWrite, reasoning } = usage;
  const hit = cacheHit([usage], 1);
  const uncached = uncachedTokens(usage);
  return (
    <div className="space-y-2 border-t border-border pt-3">
      {usage.route && (
        <div className="flex justify-between gap-6 text-caption text-muted-foreground">
          <span>{t('Provider / model')}</span>
          <span className="min-w-0 text-right break-all">{usage.route}</span>
        </div>
      )}
      {hit !== undefined && (
        <div className="flex justify-between text-caption text-muted-foreground">
          <span>{t('Cache hit')}</span>
          <span>{hit}%</span>
        </div>
      )}
      <UsageCount label={t('Uncached input')} value={uncached !== undefined && uncached >= 0 ? uncached : undefined} />
      <UsageCount label={t('Cache read')} value={cacheRead} />
      <UsageCount label={t('Cache write')} value={cacheWrite} />
      <UsageCount label={t('Output tokens')} value={output} />
      <UsageCount label={t('Reasoning tokens')} value={reasoning} />
    </div>
  );
}

export function TurnUsage({ models }: { models: ModelUsage[] }) {
  useLocale();
  const total = totalTokens(models);
  if (total === undefined) return null;
  return (
    <Popover>
      <PopoverTrigger
        variant="ghost"
        size="sm"
        aria-label={t('Turn usage')}
        className="gap-1.5 px-2 font-normal text-muted-foreground"
      >
        <DshDatabase />
        <span>{t('Usage {tokens}', { tokens: `${compactTokens(total)} tok` })}</span>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="max-h-96 w-80 max-w-[calc(100vw-2rem)] space-y-3 overflow-y-auto p-4"
        aria-label={t('Turn usage')}
      >
        <div className="flex items-center justify-between gap-4">
          <Txt as="span" variant="label">
            <span className="inline-flex items-center gap-1.5 [&_svg]:size-3.5">
              <DshDatabase />
              {t('Turn usage')}
            </span>
          </Txt>
          <Txt as="span" variant="caption" className="tabular-nums">
            {exactTokens(total)}
          </Txt>
        </div>
        {groupModelUsage(models).map((usage, index) => (
          <ModelUsageRows key={index} usage={usage} />
        ))}
      </PopoverContent>
    </Popover>
  );
}
