import type { GetWorkflowResponse } from '@mastra/client-js';
import { Badge } from '@/ds/components/Badge';
import { CopyButton } from '@/ds/components/CopyButton';
import { Txt } from '@/ds/components/Txt';
import { Icon } from '@/ds/icons/Icon';
import { WorkflowIcon } from '@/ds/icons/WorkflowIcon';
import { t as studioT, useLocale } from '@/lib/i18n';

export function InitialWorkflowHeader({ workflow, workflowId }: { workflow: GetWorkflowResponse; workflowId: string }) {
  useLocale();
  const stepsCount = Object.keys(workflow.steps ?? {}).length;

  return (
    <div className="flex w-full items-center gap-2 px-5">
      <Icon className="shrink-0 text-muted-foreground">
        <WorkflowIcon />
      </Icon>
      <Txt as="span" variant="subheading" tone="ink" className="truncate">
        {workflow.name ?? workflowId}
      </Txt>
      <CopyButton content={workflow.name ?? workflowId} variant="ghost" className="shrink-0" />
      <Badge className="ml-auto shrink-0">
        {stepsCount} {' ' + studioT('step')}
        {stepsCount === 1 ? '' : studioT('English plural suffix')}
      </Badge>
    </div>
  );
}
