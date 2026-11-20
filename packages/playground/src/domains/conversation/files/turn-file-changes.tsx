import { CodeDiff } from '@mastra/playground-ui/components/CodeDiff';
import { Txt } from '@mastra/playground-ui/components/Txt';
import { t, useLocale } from '@mastra/playground-ui/lib/i18n';
import { useQuery } from '@tanstack/react-query';
import { useAccount } from '@/domains/account/account-context';
import type { getTurnFileChanges } from '@/domains/account/storage-api';
import { getTurnFileDiff } from '@/domains/account/storage-api';
import { useStudioConfig } from '@/domains/configuration/context/studio-config-state';

type Change = Awaited<ReturnType<typeof getTurnFileChanges>>[number];

export function TurnFileChanges({ changes, thread }: { changes: Change[]; thread: string }) {
  useLocale();
  if (!changes.length) return null;
  return (
    <details className="bg-surface1 min-w-0 rounded-lg border border-border px-3 py-2">
      <summary className="cursor-pointer text-label">{t('Files changed ({count})', { count: changes.length })}</summary>
      <ul className="mt-2 space-y-2">
        {changes.map(change => (
          <li key={change.path}>
            <ChangeDiff change={change} thread={thread} />
          </li>
        ))}
      </ul>
    </details>
  );
}

function ChangeDiff({ change, thread }: { change: Change; thread: string }) {
  const target = useStudioConfig();
  const account = useAccount();
  const label = change.kind === 'added' ? t('Added') : change.kind === 'deleted' ? t('Deleted') : t('Modified');
  const query = useQuery({
    queryKey: ['turn-file-diff', target.baseUrl, target.headers, account?.user.id, thread, change.turn, change.path],
    queryFn: ({ signal }) => getTurnFileDiff(target, thread, change.turn, change.path, signal),
    enabled: false,
    retry: false,
  });
  const title = (
    <>
      {change.name}
      <span className="ml-2 text-muted-foreground">{label}</span>
    </>
  );
  if (!change.hasDiff) return <Txt variant="label">{title}</Txt>;
  return (
    <details
      onToggle={event => {
        if (event.currentTarget.open) void query.refetch();
      }}
    >
      <summary className="cursor-pointer text-label">{title}</summary>
      <div className="mt-2">
        {query.isError ? (
          <Txt role="alert">{t('File storage is unavailable. Please retry.')}</Txt>
        ) : query.data ? (
          <CodeDiff
            codeA={query.data.before ?? ''}
            codeB={query.data.after ?? ''}
            filename={change.name}
            layout="unified"
          />
        ) : (
          <Txt tone="muted">{t('Loading...')}</Txt>
        )}
      </div>
    </details>
  );
}
