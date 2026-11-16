import { DataPanel } from '@mastra/playground-ui/components/DataPanel';

import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';
import { useExecuteTool, useTool } from '@mastra/react/hooks/tools';
import type { ToolExecution } from '../../utils/tool-run';
import { useOpenToolId } from './open-tool-context';
import { ToolDrawerBody } from './tool-drawer-body';

export function ToolsPageDrawerBody() {
  useLocale();
  const toolId = useOpenToolId();
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
