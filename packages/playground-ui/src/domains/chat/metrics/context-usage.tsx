import type { ContextReading } from './chat-metrics';
import { compactTokens, exactTokens } from './chat-metrics';
import { Popover, PopoverContent, PopoverTrigger } from '@/ds/components/Popover';
import { t } from '@/lib/i18n';

const radius = 5.5;
const circumference = 2 * Math.PI * radius;

/** DSH ContextMeter geometry. Never substitute heuristic component counts for provider usage. */
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
  const occupied = Math.min(100, (reading.usedTokens / capacity) * 100);
  const percent = Math.round(occupied);
  // ModelHub reports aggregate input usage, not a token count for each request component.
  const rows = [
    { label: t('System prompt'), color: 'bg-[#adb2b8]' },
    { label: t('Tool definitions'), color: 'bg-[#a78bfa]' },
    { label: t('Conversation messages'), color: 'bg-[#4d93f8]' },
  ];
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        size="sm"
        variant="ghost"
        aria-label={t('Context usage')}
        className="h-auto min-h-6 gap-1.5 rounded-md px-2 py-1 font-normal text-muted-foreground"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <circle cx="7" cy="7" r={radius} stroke="currentColor" strokeWidth="2" opacity="0.25" />
          <circle
            cx="7"
            cy="7"
            r={radius}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - occupied / 100)}
            transform="rotate(-90 7 7)"
          />
        </svg>
        <span>{percent}%</span>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={8}
        aria-label={t('Context usage')}
        className="w-[264px] max-w-[calc(100vw-1.5rem)] overflow-y-auto p-3 text-caption"
      >
        <div className="flex items-center gap-1.5 whitespace-nowrap tabular-nums">
          <span className="text-muted-foreground">{t('Context used')}</span>
          <span>{percent}%</span>
          <span className="ml-auto" aria-label={`${exactTokens(reading.usedTokens)} / ${exactTokens(capacity)}`}>
            {compactTokens(reading.usedTokens)} / {compactTokens(capacity)}
          </span>
        </div>
        <div
          className="my-3 flex h-1 overflow-hidden rounded-full bg-fill"
          role="meter"
          aria-label={t('Context usage')}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-valuetext={`${exactTokens(reading.usedTokens)} / ${exactTokens(capacity)}`}
        >
          <span className="h-full rounded-sm bg-[#adb2b8]" style={{ width: `${occupied}%` }} />
        </div>
        <dl className="space-y-1">
          {rows.map(row => (
            <div key={row.label} className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-1.5 text-muted-foreground">
                <span aria-hidden="true" className={`size-2 shrink-0 rounded-[2px] ${row.color}`} />
                {row.label}
              </dt>
              <dd className="m-0 tabular-nums">{t('Not provided')}</dd>
            </div>
          ))}
        </dl>
      </PopoverContent>
    </Popover>
  );
}
