import type { ContextReading } from './chat-metrics';
import { compactTokens, exactTokens } from './chat-metrics';
import { StatCard, StatRows } from './stat-card';
import { t } from '@/lib/i18n';

const radius = 5.5;
const circumference = 2 * Math.PI * radius;

/** DSH's ring and click card, backed entirely by provider usage and declared input capacity. */
export function ContextUsage({
  reading,
  capacity,
  route,
  open,
  onOpenChange,
}: {
  reading?: ContextReading;
  capacity?: number;
  route?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!reading || !capacity || !Number.isFinite(capacity) || capacity <= 0 || (route && reading.route !== route))
    return null;
  const percent = Math.min(100, Math.round((reading.usedTokens / capacity) * 100));
  return (
    <StatCard
      title={t('Context usage')}
      heading={t('Context used {percent}%', { percent })}
      label={`${percent}%`}
      value={`${compactTokens(reading.usedTokens)} / ${compactTokens(capacity)}`}
      open={open}
      onOpenChange={onOpenChange}
      icon={
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <circle cx="7" cy="7" r={radius} stroke="currentColor" strokeWidth="2" opacity="0.25" />
          <circle
            cx="7"
            cy="7"
            r={radius}
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - percent / 100)}
            transform="rotate(-90 7 7)"
          />
        </svg>
      }
    >
      <div
        className="mb-4 flex h-1.5 overflow-hidden rounded-full bg-fill"
        role="meter"
        aria-label={t('Context usage')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <span className="bg-blue-500" style={{ width: `${percent}%` }} />
      </div>
      <StatRows
        rows={[
          { label: t('Input tokens'), value: exactTokens(reading.usedTokens) },
          ...(reading.outputTokens === undefined
            ? []
            : [{ label: t('Output tokens'), value: exactTokens(reading.outputTokens) }]),
          { label: t('Input context limit'), value: exactTokens(capacity) },
        ]}
      />
    </StatCard>
  );
}
