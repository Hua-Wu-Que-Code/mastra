import { useMastraClient } from '@mastra/react';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { backgroundTaskQueryKey } from './use-deferred-input-request';
import { isTerminalMcpTaskStatus } from './use-mcp-task-progress';
import type { McpTaskStatus, McpTaskView } from './use-mcp-task-progress';
import { Badge } from '@/ds/components/Badge';
import type { BadgeIndicator, BadgeVariant } from '@/ds/components/Badge';
import { CopyButton } from '@/ds/components/CopyButton';
import { Txt } from '@/ds/components/Txt';
import { t as studioT, useLocale } from '@/lib/i18n';
import { Trans } from '@/lib/i18n/trans';

const STATUS: Record<McpTaskStatus, { label: string; variant: BadgeVariant; indicator?: BadgeIndicator }> = {
  working: {
    get label() {
      return studioT('working');
    },
    variant: 'info',
    indicator: 'pulse',
  },
  input_required: {
    get label() {
      return studioT('input required');
    },
    variant: 'warning',
    indicator: 'dot',
  },
  completed: {
    get label() {
      return studioT('completed');
    },
    variant: 'success',
  },
  failed: {
    get label() {
      return studioT('failed');
    },
    variant: 'destructive',
  },
  cancelled: {
    get label() {
      return studioT('cancelled');
    },
    variant: 'neutral',
  },
};

/** Now, every second, until `endedAt` is known. */
function useClock(endedAt: number | undefined) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (endedAt !== undefined) return;
    const timer = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, [endedAt]);
  return endedAt ?? now;
}

const formatElapsed = (ms: number) => {
  // A server may send a valid ISO 8601 `createdAt` that `Date.parse` can't read, like `20261029T120000Z`.
  if (Number.isNaN(ms)) return '--:--';
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

/** A `task working` badge and `0:42` elapsed for a tool call that continued as an MCP task, with its task id to copy. */
export function McpTaskChip({ task }: { task: McpTaskView }) {
  useLocale();
  const { label, variant, indicator } = STATUS[task.status];
  const terminal = isTerminalMcpTaskStatus(task.status);
  const elapsed = useClock(terminal ? task.endedAt : undefined) - Date.parse(task.createdAt);

  return (
    <span className="inline-flex flex-wrap items-center gap-2" data-testid="mcp-task-chip">
      <Badge
        aria-label={studioT('MCP task {value0} on {value1}', { value0: task.taskId, value1: task.serverName })}
        size="sm"
        variant={variant}
        emphasis="subtle"
        indicator={indicator}
      >
        <span>
          <Trans id="task {part0}" values={{ part0: label }} />
        </span>
      </Badge>
      <Txt as="span" variant="meta" font="mono" tone="muted" className="tabular-nums">
        {formatElapsed(elapsed)}
      </Txt>
      <CopyButton
        content={task.taskId}
        tooltip={studioT('Copy MCP task id')}
        copyMessage={studioT('Copied MCP task id')}
      />
    </span>
  );
}

const BACKGROUND_POLL_MS = 2_000;

/** How the Mastra background task ended, as the MCP task's status; undefined while it runs. */
const BACKGROUND_END: Record<string, McpTaskStatus | undefined> = {
  completed: 'completed',
  failed: 'failed',
  timed_out: 'failed',
  cancelled: 'cancelled',
};

/**
 * The chip for a call deferred to a Mastra background task. The chat stream ends with the turn, so
 * the task's later progress and its end never reach this card; until the progress shows the task
 * ended, the background task is polled for how it ended.
 */
export function BackgroundMcpTaskChip({ task, backgroundTaskId }: { task: McpTaskView; backgroundTaskId: string }) {
  const client = useMastraClient();
  const ended = isTerminalMcpTaskStatus(task.status);
  const { data, dataUpdatedAt } = useQuery({
    queryKey: backgroundTaskQueryKey(backgroundTaskId),
    queryFn: () => client.getBackgroundTask(backgroundTaskId),
    enabled: !ended,
    refetchInterval: query => (BACKGROUND_END[query.state.data?.status ?? ''] ? false : BACKGROUND_POLL_MS),
  });
  const backgroundEnd = ended ? undefined : BACKGROUND_END[data?.status ?? ''];
  const completedAt = data?.completedAt ? new Date(data.completedAt).getTime() : undefined;
  // The call's progress stops reaching the chat with the turn, so a question answered later still
  // reads `input_required` there; the background task says whether it is waiting or working.
  const waiting =
    data?.status === 'suspended' ? 'input_required' : data?.status === 'running' ? 'working' : task.status;

  return (
    <McpTaskChip
      task={
        backgroundEnd
          ? { ...task, status: backgroundEnd, endedAt: completedAt ?? task.endedAt ?? dataUpdatedAt }
          : ended
            ? task
            : { ...task, status: waiting }
      }
    />
  );
}
