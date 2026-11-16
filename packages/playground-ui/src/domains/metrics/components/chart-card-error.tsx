import { is401UnauthorizedError, is403ForbiddenError } from '@mastra/react/hooks/query';
import { PermissionDenied } from '@/domains/auth/components/permission-denied';
import { SessionExpired } from '@/domains/auth/components/session-expired';
import { Button } from '@/ds/components/Button';
import { MetricsCard } from '@/ds/components/MetricsCard';
import { IconArrowRotateCounterClockwise } from '@/ds/icons/central/IconArrowRotateCounterClockwise';
import { t as studioT, useLocale } from '@/lib/i18n';

/**
 * Fills a chart card's body when its data failed to load. Pass `error` and `onRetry` to explain
 * an expired session or missing permission, and to let the user try a failed request again.
 */
export function ChartCardError({ error, onRetry }: { error?: unknown; onRetry?: () => void }) {
  useLocale();
  if (is401UnauthorizedError(error)) return <SessionExpired />;
  if (is403ForbiddenError(error)) return <PermissionDenied resource="traces" />;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3">
      <MetricsCard.Error message={studioT("Couldn't load this data. Try again in a moment.")} />
      {onRetry && (
        <Button size="sm" icon={<IconArrowRotateCounterClockwise />} onClick={onRetry}>
          {studioT('Retry')}
        </Button>
      )}
    </div>
  );
}
