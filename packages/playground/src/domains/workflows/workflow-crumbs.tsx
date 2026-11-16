import { CrumbSkeleton, crumbSwitcherTriggerProps } from '@mastra/playground-ui/components/Breadcrumb';
import { CopyButton } from '@mastra/playground-ui/components/CopyButton';
import { WorkflowCombobox } from '@mastra/playground-ui/domains/workflows/components/workflow-combobox';

import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';
import { useWorkflows } from '@mastra/react/hooks/workflows';
import { useParams } from 'react-router';

export function WorkflowCrumb() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const { data: workflows, isLoading } = useWorkflows();
  if (!workflowId) return null;
  if (isLoading) return <CrumbSkeleton />;

  return workflows?.[workflowId]?.name || workflowId;
}

export function WorkflowSwitcher() {
  useLocale();
  const { workflowId } = useParams<{ workflowId: string }>();
  if (!workflowId) return null;

  return <WorkflowCombobox value={workflowId} {...crumbSwitcherTriggerProps} aria-label={studioT('Switch workflow')} />;
}

export function WorkflowRunCrumb() {
  const { runId } = useParams<{ runId: string }>();
  if (!runId) return null;

  return runId.split('-')[0];
}

export function WorkflowRunCopyAction() {
  useLocale();
  const { runId } = useParams<{ runId: string }>();
  if (!runId) return null;

  return <CopyButton content={runId} tooltip={studioT('Copy run id')} variant="ghost" size="icon-sm" />;
}
