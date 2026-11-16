import { Badge } from '@mastra/playground-ui/components/Badge';
import type { BadgeVariant } from '@mastra/playground-ui/components/Badge';
import { DropdownMenu } from '@mastra/playground-ui/components/DropdownMenu';
import { SkeletonText } from '@mastra/playground-ui/components/Skeleton';
import { Table } from '@mastra/playground-ui/components/Table';
import { Txt } from '@mastra/playground-ui/components/Txt';
import type { UserConnectProvider, UserConnection } from '@mastra/playground-ui/domains/connect';
import { ProviderLogo } from '@mastra/playground-ui/domains/connect';
import { IconDotGrid1x3Vertical } from '@mastra/playground-ui/icons/central/IconDotGrid1x3Vertical';

import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';
import { Unplug } from 'lucide-react';

function statusVariant(status: string): BadgeVariant {
  if (status === 'active') return 'success';
  if (status === 'pending') return 'neutral';
  return 'destructive';
}

interface ConnectionRowsProps {
  label: string;
  connections: UserConnection[];
  /** Catalog lookup used to resolve display names and logos. */
  providersById: ReadonlyMap<string, UserConnectProvider>;
  emptyMessage: string;
  loading?: boolean;
  /** Present only for the caller's own connections — global rows are read-only. */
  onDisconnect?: (connectionId: string, displayName: string) => void;
  disconnectPendingId?: string | null;
}

const SKELETON_ROWS = [0, 1, 2];

/** Bar widths that stand in for each column's content; the actions column stays empty. */
const SKELETON_WIDTHS = ['w-40', 'w-28', 'w-14', null];

function ConnectionRows({
  label,
  connections,
  providersById,
  emptyMessage,
  loading = false,
  onDisconnect,
  disconnectPendingId,
}: ConnectionRowsProps) {
  useLocale();
  const columnCount = 4;

  return (
    <Table.Body aria-label={label}>
      <Table.Row>
        <Table.Head scope="rowgroup" colSpan={columnCount}>
          {onDisconnect ? studioT('User') : studioT('Global')}
        </Table.Head>
      </Table.Row>
      {loading ? (
        SKELETON_ROWS.map(index => (
          <Table.Row key={index}>
            {SKELETON_WIDTHS.map((width, cell) => (
              <Table.Cell key={cell}>{width ? <SkeletonText className={width} /> : null}</Table.Cell>
            ))}
          </Table.Row>
        ))
      ) : connections.length === 0 ? (
        <Table.Row>
          <Table.Cell colSpan={columnCount}>
            <Txt as="span" variant="body-sm" tone="muted">
              {emptyMessage}
            </Txt>
          </Table.Cell>
        </Table.Row>
      ) : (
        connections.map(connection => {
          // Row metadata first (resolved server-side from the full catalog);
          // the policy-filtered provider list is only a fallback for older
          // servers that don't send it.
          const provider = providersById.get(connection.integrationId);
          const displayName = connection.displayName ?? provider?.displayName ?? connection.integrationId;
          return (
            <Table.Row key={connection.id}>
              <Table.Cell>
                <span className="flex items-center gap-2">
                  <ProviderLogo logoUrl={connection.logoUrl ?? provider?.logoUrl} />
                  <Txt as="span" variant="body-sm">
                    {displayName}
                  </Txt>
                </span>
              </Table.Cell>
              <Table.Cell>
                <Txt as="span" variant="body-sm" tone="muted">
                  {connection.accountLabel ?? '—'}
                </Txt>
              </Table.Cell>
              <Table.Cell>
                <Badge variant={statusVariant(connection.status)} emphasis="subtle" size="sm">
                  {connection.status}
                </Badge>
              </Table.Cell>
              <Table.Cell align="right">
                {onDisconnect ? (
                  <DropdownMenu>
                    <DropdownMenu.Trigger
                      variant="ghost"
                      size="icon-sm"
                      aria-label={studioT('Actions for {value0}', { value0: displayName })}
                    >
                      <IconDotGrid1x3Vertical />
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content align="end" className="w-44">
                      <DropdownMenu.Item
                        variant="destructive"
                        disabled={disconnectPendingId === connection.id}
                        onSelect={() => onDisconnect(connection.id, displayName)}
                      >
                        <Unplug /> {' ' + studioT('Disconnect')}
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu>
                ) : null}
              </Table.Cell>
            </Table.Row>
          );
        })
      )}
    </Table.Body>
  );
}

interface ConnectionsTableProps {
  globalConnections: UserConnection[];
  userConnections: UserConnection[];
  providersById: ReadonlyMap<string, UserConnectProvider>;
  loading?: boolean;
  onDisconnect: (connectionId: string, displayName: string) => void;
  disconnectPendingId?: string | null;
}

export function ConnectionsTable({
  globalConnections,
  userConnections,
  providersById,
  loading,
  onDisconnect,
  disconnectPendingId,
}: ConnectionsTableProps) {
  useLocale();
  return (
    <Table variant="inset" aria-label={studioT('Connections')} aria-busy={loading || undefined}>
      <Table.Header>
        <Table.Row>
          <Table.Head>{studioT('Integration')}</Table.Head>
          <Table.Head>{studioT('Account')}</Table.Head>
          <Table.Head>{studioT('Status')}</Table.Head>
          <Table.Head align="right">
            <span className="sr-only">{studioT('Actions')}</span>
          </Table.Head>
        </Table.Row>
      </Table.Header>
      <ConnectionRows
        label={studioT('Global connections')}
        connections={globalConnections}
        providersById={providersById}
        loading={loading}
        emptyMessage={studioT('No global connections are linked to this project.')}
      />
      <ConnectionRows
        label={studioT('Your connections')}
        connections={userConnections}
        providersById={providersById}
        loading={loading}
        emptyMessage={studioT("You haven't connected any accounts yet.")}
        onDisconnect={onDisconnect}
        disconnectPendingId={disconnectPendingId}
      />
    </Table>
  );
}
