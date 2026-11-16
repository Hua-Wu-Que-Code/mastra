import { getSpanDurationMs } from '../utils/span-utils';
import { DataPanel } from '@/ds/components/DataPanel';
import { IconCalendarClock4 } from '@/ds/icons/central/IconCalendarClock4';
import { IconStopwatch } from '@/ds/icons/central/IconStopwatch';
import { controlSizeClasses } from '@/ds/primitives/control-size';

import { t as studioT, useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { formatDate, formatTimestampPrecise } from '@/utils/date-format';
import { formatDuration, formatDurationPrecise } from '@/utils/duration';

export interface SpanSummaryDescriptionProps {
  span: {
    startedAt: Date | string;
    endedAt?: Date | string | null;
  };
}

/** Compact span timing shown under the span side-panel heading. */
export function SpanSummaryDescription({ span }: SpanSummaryDescriptionProps) {
  useLocale();
  const startedAt = formatDate(span.startedAt, 'time');
  const exactStartedAt = formatTimestampPrecise(span.startedAt);
  const durationMs = getSpanDurationMs(span.startedAt, span.endedAt);
  const duration = formatDuration(durationMs);
  const exactDuration = formatDurationPrecise(durationMs);

  return (
    <DataPanel.Metadata>
      {startedAt && exactStartedAt && (
        <DataPanel.Meta
          icon={<IconCalendarClock4 />}
          tooltip={studioT('Started at {value0}', { value0: exactStartedAt })}
        >
          {startedAt}
        </DataPanel.Meta>
      )}
      {duration && exactDuration && (
        <DataPanel.Meta icon={<IconStopwatch />} tooltip={studioT('Duration {value0}', { value0: exactDuration })}>
          {duration}
        </DataPanel.Meta>
      )}
    </DataPanel.Metadata>
  );
}

/** The run a span belongs to, labelled and copyable like the span id next to it. */
export function SpanRunId({ runId }: { runId: string }) {
  useLocale();
  return (
    <div className={cn('inline-flex shrink-0 items-center gap-1 px-1 text-foreground', controlSizeClasses.sm)}>
      {studioT('Run id')}
      <DataPanel.CopyId id={runId} maxLength={6} ellipsis={false} />
    </div>
  );
}
