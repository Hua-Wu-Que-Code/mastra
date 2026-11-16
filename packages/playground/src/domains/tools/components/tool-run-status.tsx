import { Badge } from '@mastra/playground-ui/components/Badge';
import { CopyButton } from '@mastra/playground-ui/components/CopyButton';
import { Txt } from '@mastra/playground-ui/components/Txt';
import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';

import type { ToolRun } from '../utils/tool-run';
import { formatDuration, getRunCode } from '../utils/tool-run';

export interface ToolRunStatusProps {
  run: ToolRun;
}

export function ToolRunStatus({ run }: ToolRunStatusProps) {
  useLocale();
  return (
    <div className="flex items-center gap-2">
      {run.status === 'success' ? (
        <Badge variant="success" emphasis="subtle" indicator="dot">
          {studioT('Success')}
        </Badge>
      ) : (
        <Badge variant="destructive" emphasis="subtle" indicator="dot">
          {studioT('Error')}
        </Badge>
      )}
      <Txt as="span" variant="caption" font="mono" tone="muted">
        {formatDuration(run.durationMs)}
      </Txt>
      <CopyButton
        content={getRunCode(run)}
        copyMessage={studioT('Response copied')}
        tooltip={studioT('Copy response')}
        size="icon-sm"
      />
    </div>
  );
}
