import type { UISpan } from '../types';
import { DataKeysAndValues } from '@/ds/components/DataKeysAndValues';
import { HoverCardContent } from '@/ds/components/HoverCard';
import { Txt } from '@/ds/components/Txt';

import { t as studioT, useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { formatTimestampPrecise } from '@/utils/date-format';
import { formatDurationPrecise } from '@/utils/duration';

type SpanTimingHoverCardProps = {
  span: UISpan;
  startShiftMs: number;
};

export function SpanTimingHoverCard({ span, startShiftMs }: SpanTimingHoverCardProps) {
  useLocale();
  return (
    <HoverCardContent className="pr-6">
      <div className={cn('mt-1 mb-2 flex items-center gap-2')}>
        <Txt as="span" variant="caption" className="block">
          {studioT('Span Timing')}
        </Txt>
      </div>
      <DataKeysAndValues>
        <DataKeysAndValues.Key>{studioT('Latency')}</DataKeysAndValues.Key>
        <DataKeysAndValues.Value>{formatDurationPrecise(span.latency) ?? '-'}</DataKeysAndValues.Value>
        <DataKeysAndValues.Key>{studioT('Started at')}</DataKeysAndValues.Key>
        <DataKeysAndValues.Value>{formatTimestampPrecise(span.startTime) ?? '-'}</DataKeysAndValues.Value>
        <DataKeysAndValues.Key>{studioT('Ended at')}</DataKeysAndValues.Key>
        <DataKeysAndValues.Value>{formatTimestampPrecise(span.endTime) ?? '-'}</DataKeysAndValues.Value>
        <DataKeysAndValues.Key>{studioT('Start Shift')}</DataKeysAndValues.Key>
        <DataKeysAndValues.Value>{formatDurationPrecise(startShiftMs) ?? '-'}</DataKeysAndValues.Value>
      </DataKeysAndValues>
    </HoverCardContent>
  );
}
