import { getWorkflowRunErrors } from './workflow-run-errors';
import { Notice } from '@/ds/components/Notice';
import { t as studioT, useLocale } from '@/lib/i18n';

export function WorkflowRunError({
  result,
  workflowError,
  className,
}: {
  result: unknown;
  workflowError?: Error | null;
  className?: string;
}) {
  useLocale();
  const errors = getWorkflowRunErrors(result, workflowError);
  if (errors.length === 0) return null;

  return (
    <Notice variant="destructive" title={studioT('Workflow failed')} className={className}>
      <div className="flex flex-col gap-1">
        {errors.map(error => (
          <Notice.Message key={error}>{error}</Notice.Message>
        ))}
      </div>
    </Notice>
  );
}
