import type { GetAgentResponse, GetToolResponse } from '@mastra/client-js';
import { DataList, DataListSkeleton, useDataListKeyboard } from '@mastra/playground-ui/components/DataList';
import type { DataListSort } from '@mastra/playground-ui/components/DataList';
import { AgentIcon } from '@mastra/playground-ui/icons/AgentIcon';
import { useLinkComponent } from '@mastra/playground-ui/lib/framework';

import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';
import { sortBy } from '@mastra/playground-ui/sort/sort-by';
import type { ListSort } from '@mastra/playground-ui/sort/sort-by';
import { truncateString } from '@mastra/playground-ui/utils/truncate-string';
import { useMemo } from 'react';
import type { ToolCatalogEntry } from '@/domains/tools/hooks/use-altflow-tool-catalog';
import { prepareToolsTable } from '@/domains/tools/utils/prepareToolsTable';

export type ToolsSortKey = 'name' | 'agents';
export type ToolsSort = ListSort<ToolsSortKey>;

export interface ToolsListProps {
  tools: Record<string, GetToolResponse>;
  agents: Record<string, GetAgentResponse>;
  isLoading: boolean;
  catalog?: ToolCatalogEntry[];
  search?: string;
  sort?: ToolsSort;
  onSortChange?: (direction: DataListSort, key: ToolsSortKey) => void;
  /** The tool open in the drawer, highlighted in the list. */
  selectedToolId?: string;
}

interface ListItem {
  id: string;
  description?: string;
  agentCount: number;
  catalog?: ToolCatalogEntry;
}
const sortAccessors = {
  name: (tool: ListItem) => tool.id,
  agents: (tool: ListItem) => tool.agentCount,
};

export function ToolsList({
  tools,
  agents,
  isLoading,
  catalog,
  search = '',
  sort,
  onSortChange,
  selectedToolId,
}: ToolsListProps) {
  useLocale();
  const { paths, Link } = useLinkComponent();

  const toolData = useMemo(() => prepareToolsTable(tools, agents), [tools, agents]);

  const combined = new Map<string, ListItem>(
    toolData.map(tool => [
      tool.id,
      {
        id: tool.id,
        description: tool.description,
        agentCount: tool.agents.length,
      },
    ]),
  );
  for (const entry of catalog ?? []) {
    combined.set(entry.id, {
      id: entry.id,
      description: entry.description,
      agentCount: entry.agents.length,
      catalog: entry,
    });
  }
  const filteredData = sortBy(
    [...combined.values()].filter(tool => tool.id.toLowerCase().includes(search.toLowerCase())),
    sort,
    sortAccessors,
  );
  const interactive = filteredData;
  const { containerRef, getRowProps } = useDataListKeyboard({ count: interactive.length, global: true });

  if (isLoading) {
    return <DataListSkeleton columns="auto minmax(0,1fr) auto" />;
  }

  const sortFor = (key: ToolsSortKey) => (sort?.key === key ? sort.direction : undefined);

  return (
    <DataList columns="auto minmax(0,1fr) auto" scrollRef={containerRef}>
      <DataList.Top>
        {onSortChange ? (
          <DataList.SortableTopCell sortKey="name" sort={sortFor('name')} onSortChange={onSortChange}>
            {studioT('Name')}
          </DataList.SortableTopCell>
        ) : (
          <DataList.TopCell>{studioT('Name')}</DataList.TopCell>
        )}
        <DataList.TopCell>{studioT('Description')}</DataList.TopCell>
        {onSortChange ? (
          <DataList.SortableTopCell sortKey="agents" sort={sortFor('agents')} onSortChange={onSortChange} align="end">
            {studioT('Agents')}
          </DataList.SortableTopCell>
        ) : (
          <DataList.TopCellSmart
            long="Agents"
            short={<AgentIcon />}
            tooltip={studioT('Attached agents')}
            className="text-center"
          />
        )}
      </DataList.Top>

      {filteredData.length === 0 && search ? (
        <DataList.NoMatch message={studioT('No Tools match your search')} />
      ) : null}

      {filteredData.map(tool => {
        const name = truncateString(tool.id, 50);
        const entry = tool.catalog;
        const status =
          entry?.status === 'unconfigured'
            ? studioT('Not configured')
            : entry?.status === 'conditional'
              ? studioT('Enabled in conversation')
              : studioT('Available');
        const description = truncateString(tool.description ?? '', 200);
        const cells = (
          <>
            <DataList.NameCell>{name}</DataList.NameCell>
            <DataList.DescriptionCell>
              {description}
              {entry && (
                <span
                  className="flex flex-wrap gap-x-3 text-muted-foreground"
                  title={
                    entry.reason ?? (entry.runtime ? studioT('Runtime tools are used in conversations.') : undefined)
                  }
                >
                  <span>{studioT('Source: {value0}', { value0: entry.source })}</span>
                  <span>{status}</span>
                  {entry.reason && <span>{entry.reason}</span>}
                </span>
              )}
            </DataList.DescriptionCell>
            <DataList.TextCell className="text-center">{tool.agentCount || ''}</DataList.TextCell>
          </>
        );
        return (
          <DataList.RowLink
            key={tool.id}
            to={paths.toolLink(tool.id)}
            LinkComponent={Link}
            featured={tool.id === selectedToolId}
            {...getRowProps(interactive.indexOf(tool))}
          >
            {cells}
          </DataList.RowLink>
        );
      })}
    </DataList>
  );
}
