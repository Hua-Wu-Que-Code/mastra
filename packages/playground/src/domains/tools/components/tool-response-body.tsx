import { Code } from '@mastra/playground-ui/components/Code';
import { CodeEditor } from '@mastra/playground-ui/components/CodeEditor';
import { EmptyState } from '@mastra/playground-ui/components/EmptyState';
import { Spinner } from '@mastra/playground-ui/components/Spinner';
import { IconSend } from '@mastra/playground-ui/icons/central/IconSend';
import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';

import type { ToolRun } from '../utils/tool-run';
import { getRunCode } from '../utils/tool-run';

export interface ToolResponseBodyProps {
  isRunning: boolean;
  lastRun?: ToolRun;
}

export function ToolResponseBody({ isRunning, lastRun }: ToolResponseBodyProps) {
  useLocale();
  if (isRunning) {
    return (
      <EmptyState
        iconSlot={<Spinner />}
        titleSlot={studioT('Running…')}
        descriptionSlot={studioT('Waiting for the tool to respond.')}
      />
    );
  }

  if (!lastRun) {
    return (
      <EmptyState
        iconSlot={<IconSend />}
        titleSlot={studioT('No response yet')}
        descriptionSlot={studioT('Run the tool to see its output here.')}
      />
    );
  }

  if (lastRun.status === 'error') {
    return <Code code={getRunCode(lastRun)} className="overflow-x-auto p-4 text-caption whitespace-pre" />;
  }

  return (
    <CodeEditor
      value={getRunCode(lastRun)}
      language="json"
      editable={false}
      lineNumbers={false}
      showCopyButton={false}
      variant="embedded"
      aria-label={studioT('Tool response')}
      className="p-4"
    />
  );
}
