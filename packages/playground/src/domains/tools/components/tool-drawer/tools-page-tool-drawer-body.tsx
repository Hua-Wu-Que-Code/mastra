import { DataPanel } from '@mastra/playground-ui/components/DataPanel';
import { Txt } from '@mastra/playground-ui/components/Txt';
import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';
import { useExecuteTool, useTool } from '@mastra/react/hooks/tools';
import { useAltflowToolCatalog } from '../../hooks/use-altflow-tool-catalog';
import type { ToolExecution } from '../../utils/tool-run';

import { toolSummary } from '../../utils/tool-summary';
import { ToolOverview } from '../tool-overview';
import { useOpenToolId } from './open-tool-context';
import { ToolDrawerBody } from './tool-drawer-body';
import { ToolDrawerContent } from './tool-drawer-content';

export function ToolsPageDrawerBody() {
  useLocale();
  const toolId = useOpenToolId();
  const catalog = useAltflowToolCatalog();
  if (catalog.isPending) return <DataPanel.LoadingData />;
  const entry = catalog.data?.find(entry => entry.id === toolId);
  if (entry?.runtime || (entry && entry.status !== 'available')) {
    const reason = entry.reason ?? studioT('This tool runs in a conversation and requires its runtime context.');
    return (
      <ToolDrawerContent
        description={toolSummary(entry.id, entry.description)}
        canRun={false}
        runDisabledReason={reason}
        playground={null}
        overview={
          <ToolOverview
            inputSchema={entry.inputSchema}
            outputSchema={entry.outputSchema}
            requestContextSchema={entry.requestContextSchema}
            footer={<Txt tone="muted">{reason}</Txt>}
          />
        }
      />
    );
  }
  return <ApiToolDrawerBody toolId={toolId} />;
}
function ApiToolDrawerBody({ toolId }: { toolId: string }) {
  useLocale();
  const { data: tool, isLoading } = useTool({ toolId });
  const { mutateAsync, status, data, error } = useExecuteTool();
  const execution: ToolExecution = {
    execute: (input, requestContext) => mutateAsync({ toolId, input, requestContext }),
    status,
    output: data,
    error,
  };

  if (isLoading) return <DataPanel.LoadingData />;
  if (!tool)
    return (
      <DataPanel.NoData>
        {studioT('Tool "')}
        {toolId}
        {studioT('" not found.')}
      </DataPanel.NoData>
    );

  return (
    <ToolDrawerBody
      tool={tool}
      execution={execution}
      requestContextEntityType="tool"
      requestContextEntityId={tool.id}
    />
  );
}
