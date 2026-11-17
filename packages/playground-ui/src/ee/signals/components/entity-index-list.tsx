import type { ThemeLearningEntity } from '@mastra/client-js';
import { entityIndexMetadata } from './entity-index-model';
import { EntityIndexStatus } from './entity-index-status';
import { DataList } from '@/ds/components/DataList';

import type { LinkComponent } from '@/ds/types/link-component';
import { t as studioT, useLocale } from '@/lib/i18n';
import { Trans } from '@/lib/i18n/trans';

const columns = 'minmax(12rem,1.5fr) minmax(7rem,0.6fr) minmax(8rem,0.7fr) minmax(8rem,0.7fr) minmax(12rem,1fr)';

export interface EntityIndexListProps {
  entities: readonly ThemeLearningEntity[];
  hasSearch: boolean;
  getEntityHref: (entity: ThemeLearningEntity) => string;
  LinkComponent: LinkComponent;
}

export function EntityIndexList({ entities, hasSearch, getEntityHref, LinkComponent }: EntityIndexListProps) {
  useLocale();
  return (
    <section aria-label={studioT('Trace Intelligence agents')} className="min-h-0">
      <DataList columns={columns} fit="container">
        <DataList.Top>
          <DataList.TopCell>{studioT('Agent')}</DataList.TopCell>
          <DataList.TopCell>{studioT('Traces')}</DataList.TopCell>
          <DataList.TopCell>{studioT('Signals set')}</DataList.TopCell>
          <DataList.TopCell>{studioT('Status')}</DataList.TopCell>
          <DataList.TopCell>{studioT('Updated')}</DataList.TopCell>
        </DataList.Top>
        {entities.length === 0 && hasSearch ? (
          <DataList.NoMatch message={studioT('No agents match your search')} />
        ) : null}
        {entities.map(entity => {
          const metadata = entityIndexMetadata(entity);
          const key = `${entity.entityType}:${entity.entityId}`;
          const isAnalyzing = entity.status === 'collecting';
          const cells = (
            <>
              <DataList.Cell className="min-w-0 overflow-visible text-left">
                {isAnalyzing ? null : (
                  <span className="sr-only">
                    <Trans id="Open agent {part0}" values={{ part0: entity.entityId }} />
                  </span>
                )}
                <span
                  aria-hidden={isAnalyzing ? undefined : true}
                  className="block overflow-clip text-ellipsis whitespace-nowrap"
                >
                  {entity.entityId}
                </span>
              </DataList.Cell>
              <DataList.NumberCell>{metadata.traceCount}</DataList.NumberCell>
              <DataList.Cell>{metadata.signalsSet}</DataList.Cell>
              <DataList.Cell className="overflow-visible">
                <EntityIndexStatus entity={entity} />
              </DataList.Cell>
              <DataList.Cell aria-label={entity.updatedAt}>{metadata.updatedAt}</DataList.Cell>
            </>
          );
          // No signals yet means the detail page has nothing to show, so the row stays static.
          if (isAnalyzing) {
            return (
              <DataList.RowStatic key={key} className="min-w-0">
                {cells}
              </DataList.RowStatic>
            );
          }
          return (
            <DataList.RowLink key={key} to={getEntityHref(entity)} LinkComponent={LinkComponent} className="min-w-0">
              {cells}
            </DataList.RowLink>
          );
        })}
      </DataList>
    </section>
  );
}
