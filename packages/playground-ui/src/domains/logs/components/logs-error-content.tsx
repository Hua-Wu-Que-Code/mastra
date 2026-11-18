import {
  is401UnauthorizedError,
  is403ForbiddenError,
  isObservabilityUnavailableError,
  isUnsupportedObservabilityOperationError,
} from '@mastra/react/hooks/query';
import { PermissionDenied } from '@/domains/auth/components/permission-denied';
import { SessionExpired } from '@/domains/auth/components/session-expired';
import { EmptyState } from '@/ds/components/EmptyState';
import { useLocale, t as studioT } from '@/lib/i18n';

export interface LogsErrorContentProps {
  /** The error from a useLogs query. */
  error: unknown;
  /** Passed to PermissionDenied (usually 'logs'). */
  resource: string;
  /** Title shown on the generic error fallback. */
  errorTitle: string;
}

/**
 * Renders the appropriate fallback content for a logs-related query error:
 * `<SessionExpired />` for 401, `<PermissionDenied />` for 403, otherwise `<EmptyState tone="error" />`.
 * Mirror of `TracesErrorContent` for the logs domain.
 */
export function LogsErrorContent({ error, resource, errorTitle }: LogsErrorContentProps) {
  useLocale();
  if (is401UnauthorizedError(error)) return <SessionExpired />;
  if (is403ForbiddenError(error)) return <PermissionDenied resource={resource} />;
  if (isObservabilityUnavailableError(error)) {
    return (
      <EmptyState
        titleSlot={studioT('Observability storage is not available')}
        descriptionSlot={studioT(
          'The observability storage domain is disabled or not configured. Enable it in your storage configuration to view logs in Altflow.',
        )}
      />
    );
  }
  if (isUnsupportedObservabilityOperationError(error, 'logs')) {
    return (
      <EmptyState
        titleSlot={studioT('Logs are not available with your current storage')}
        descriptionSlot={studioT(
          'The configured observability storage provider does not support listing logs. Switch to a storage provider with logs support to view runtime logs in Altflow.',
        )}
      />
    );
  }
  const message = error instanceof Error ? error.message : undefined;
  return <EmptyState tone="error" titleSlot={errorTitle} descriptionSlot={message ?? studioT('Unknown error')} />;
}
