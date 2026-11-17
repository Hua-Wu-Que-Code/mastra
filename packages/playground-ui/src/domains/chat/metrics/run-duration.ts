import { t } from '@/lib/i18n';

/** DSH elapsed clock, rounded down to whole seconds, with at least one second on completion. */
export function runDurationLabel(ms: number): string {
  const seconds = Math.max(1, Math.floor(ms / 1000));
  if (seconds < 60) return t('{seconds}s', { seconds });
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t('{minutes}m {seconds}s', { minutes, seconds: seconds % 60 });
  return t('{hours}h {minutes}m {seconds}s', {
    hours: Math.floor(minutes / 60),
    minutes: minutes % 60,
    seconds: seconds % 60,
  });
}
