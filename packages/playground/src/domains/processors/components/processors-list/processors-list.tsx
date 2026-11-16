import { DataList, DataListSkeleton, useDataListKeyboard } from '@mastra/playground-ui/components/DataList';
import type { DataListSort } from '@mastra/playground-ui/components/DataList';
import { IconCheckmark2Medium } from '@mastra/playground-ui/icons/central/IconCheckmark2Medium';
import { IconFileArrowRightIn } from '@mastra/playground-ui/icons/central/IconFileArrowRightIn';
import { IconFileArrowRightOut } from '@mastra/playground-ui/icons/central/IconFileArrowRightOut';
import { useLinkComponent } from '@mastra/playground-ui/lib/framework';

import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';
import { sortBy } from '@mastra/playground-ui/sort/sort-by';
import type { ListSort } from '@mastra/playground-ui/sort/sort-by';
import { truncateString } from '@mastra/playground-ui/utils/truncate-string';
import type { ProcessorInfo, ProcessorPhase } from '@mastra/react/hooks/processors';
import { useMemo } from 'react';

const phaseKeys: ProcessorPhase[] = ['input', 'inputStep', 'outputStep', 'outputStream', 'outputResult'];

export type ProcessorsSortKey = 'name' | 'agents';
export type ProcessorsSort = ListSort<ProcessorsSortKey>;

export interface ProcessorsListProps {
  processors: Record<string, ProcessorInfo>;
  isLoading: boolean;
  search?: string;
  sort?: ProcessorsSort;
  onSortChange?: (direction: DataListSort, key: ProcessorsSortKey) => void;
}

const sortAccessors = {
  name: (processor: ProcessorInfo) => processor.name || processor.id,
  agents: (processor: ProcessorInfo) => processor.agentIds?.length ?? 0,
};

export function ProcessorsList({ processors, isLoading, search = '', sort, onSortChange }: ProcessorsListProps) {
  useLocale();
  const { paths, Link } = useLinkComponent();

  const processorData = useMemo(
    () => Object.values(processors ?? {}).filter(p => p.phases && p.phases.length > 0),
    [processors],
  );

  const filteredData = useMemo(() => {
    const term = search.toLowerCase();
    return sortBy(
      processorData.filter(p => p.id.toLowerCase().includes(term) || (p.name || '').toLowerCase().includes(term)),
      sort,
      sortAccessors,
    );
  }, [processorData, search, sort]);

  const { containerRef, getRowProps } = useDataListKeyboard({ count: filteredData.length, global: true });

  if (isLoading) {
    return <DataListSkeleton columns="auto 1fr auto auto auto auto auto auto" />;
  }

  const sortFor = (key: ProcessorsSortKey) => (sort?.key === key ? sort.direction : undefined);

  return (
    <DataList columns="auto 1fr auto auto auto auto auto auto" scrollRef={containerRef}>
      <DataList.Top>
        {onSortChange ? (
          <DataList.SortableTopCell sortKey="name" sort={sortFor('name')} onSortChange={onSortChange}>
            {studioT('Name')}
          </DataList.SortableTopCell>
        ) : (
          <DataList.TopCell>{studioT('Name')}</DataList.TopCell>
        )}
        <DataList.TopCell>{studioT('Description')}</DataList.TopCell>
        <DataList.TopCellSmart
          long="Input"
          short="Input"
          tooltip={studioT('Contains input phase')}
          className="text-center"
        />
        <DataList.TopCellSmart
          long="Input Step"
          short={
            <>
              <IconFileArrowRightIn /> {' ' + studioT('Step')}
            </>
          }
          tooltip={studioT('Contains input step phase')}
          className="text-center"
        />
        <DataList.TopCellSmart
          long="Output Step"
          short={
            <>
              <IconFileArrowRightOut /> {' ' + studioT('Step')}
            </>
          }
          tooltip={studioT('Contains output step phase')}
          className="text-center"
        />
        <DataList.TopCellSmart
          long="Output Stream"
          short={
            <>
              <IconFileArrowRightOut /> {' ' + studioT('Stream')}
            </>
          }
          tooltip={studioT('Contains output stream phase')}
          className="text-center"
        />
        <DataList.TopCellSmart
          long="Output Result"
          short={
            <>
              <IconFileArrowRightOut /> {' ' + studioT('Result')}
            </>
          }
          tooltip={studioT('Contains output result phase')}
          className="text-center"
        />
        {onSortChange ? (
          <DataList.SortableTopCell sortKey="agents" sort={sortFor('agents')} onSortChange={onSortChange} align="end">
            {studioT('Used by')}
          </DataList.SortableTopCell>
        ) : (
          <DataList.TopCellSmart short="Used by" long="Used by Agents" className="text-center" />
        )}
      </DataList.Top>

      {filteredData.length === 0 && search ? (
        <DataList.NoMatch message={studioT('No Processors match your search')} />
      ) : null}

      {filteredData.map((processor, index) => {
        const name = truncateString(processor.name || processor.id, 50);
        const description = truncateString(processor.description ?? '', 200);
        const agentsCount = processor.agentIds?.length ?? 0;
        const phaseSet = new Set(processor.phases || []);

        const linkTo = processor.isWorkflow
          ? paths.workflowLink(processor.id) + '/graph'
          : paths.processorLink(processor.id);

        return (
          <DataList.RowLink key={processor.id} to={linkTo} LinkComponent={Link} {...getRowProps(index)}>
            <DataList.NameCell>{name}</DataList.NameCell>
            <DataList.DescriptionCell>{description}</DataList.DescriptionCell>
            {phaseKeys.map(key => (
              <DataList.TextCell key={key} className="text-center">
                {phaseSet.has(key) && <IconCheckmark2Medium className="mx-auto size-icon-md" />}
              </DataList.TextCell>
            ))}
            <DataList.TextCell className="text-center">{agentsCount || ''}</DataList.TextCell>
          </DataList.RowLink>
        );
      })}
    </DataList>
  );
}
