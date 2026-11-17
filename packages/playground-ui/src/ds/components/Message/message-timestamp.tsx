import { MessageMetadata } from './message';
import { useClock } from '@/hooks/use-clock';
import { formatDate, formatMessageClock, toDate } from '@/utils/date-format';

/** `just now` for a message's first minute, then `7 minutes ago`, `yesterday`, `last week`. */
function sentAgo(time: Date, now: number) {
  return now - time.getTime() < 60_000 ? 'just now' : formatDate(time, 'relative-long', { now });
}

/** Relative time by default; chat uses date-aware clocks without hover hints. */
export function MessageTimestamp({
  value,
  format = 'relative',
}: {
  value: Date | string;
  format?: 'relative' | 'clock';
}) {
  const time = toDate(value);
  const label = useClock(now => time && (format === 'clock' ? formatMessageClock(time, { now }) : sentAgo(time, now)));
  if (!time) return null;

  return (
    <MessageMetadata>
      <time dateTime={time.toISOString()} className="whitespace-nowrap tabular-nums">
        {label}
      </time>
    </MessageMetadata>
  );
}
