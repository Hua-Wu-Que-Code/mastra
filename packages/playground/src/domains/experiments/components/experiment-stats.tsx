import type { DatasetExperiment } from '@mastra/client-js';
import { Spinner } from '@mastra/playground-ui/components/Spinner';
import { IconCircleCheck } from '@mastra/playground-ui/icons/central/IconCircleCheck';
import { IconCircleX } from '@mastra/playground-ui/icons/central/IconCircleX';
import { IconClock } from '@mastra/playground-ui/icons/central/IconClock';
import { cn } from '@mastra/playground-ui/utils/cn';
import { STATUS_LABEL } from './experiment-columns';

type RunStatus = 'pending' | 'running' | 'completed' | 'failed';

// Labels match the experiments list badges so "queued" vs "in progress" reads the same everywhere.
const statusIconMap: Record<RunStatus, { icon: React.ReactNode; label: string }> = {
  pending: { icon: <IconClock className="size-icon-md text-warning-foreground" />, label: STATUS_LABEL.pending },
  running: { icon: <Spinner size="sm" />, label: STATUS_LABEL.running },
  completed: {
    icon: <IconCircleCheck className="size-icon-md text-muted-foreground" />,
    label: STATUS_LABEL.completed,
  },
  failed: { icon: <IconCircleX className="size-icon-md text-destructive-foreground" />, label: STATUS_LABEL.failed },
};

/** Compact status indicator — an accessible icon naming the run state. */
export function ExperimentStatusIcon({
  status,
  className,
}: {
  status: DatasetExperiment['status'];
  className?: string;
}) {
  const config = statusIconMap[status] ?? statusIconMap.pending;

  return (
    <span role="img" aria-label={config.label} className={cn('flex shrink-0 items-center', className)}>
      {config.icon}
    </span>
  );
}
