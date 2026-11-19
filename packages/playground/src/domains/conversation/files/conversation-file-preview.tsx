import { Button } from '@mastra/playground-ui/components/Button';
import { MarkdownRenderer } from '@mastra/playground-ui/components/MarkdownRenderer';
import { Txt } from '@mastra/playground-ui/components/Txt';
import { IconArrowLeft } from '@mastra/playground-ui/icons/central/IconArrowLeft';
import { IconCloudDownload } from '@mastra/playground-ui/icons/central/IconCloudDownload';
import { t, useLocale } from '@mastra/playground-ui/lib/i18n';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ConversationBinaryPreview } from './conversation-binary-preview';
import { useAccount } from '@/domains/account/account-context';
import { FILE_PREVIEW_LIMIT, downloadStoredFile, readStoredFile } from '@/domains/account/storage-api';
import type { StoredFile } from '@/domains/account/storage-api';
import { useStudioConfig } from '@/domains/configuration/context/studio-config-state';

export function ConversationFilePreview({ file, onBack }: { file: StoredFile; onBack: () => void }) {
  useLocale();
  const target = useStudioConfig();
  const account = useAccount();
  const image = /^image\/(png|jpeg|gif|webp|avif)$/.test(file.mimeType);
  const pdf = file.mimeType === 'application/pdf';
  const text =
    file.mimeType.startsWith('text/') ||
    /\.(md|mdx|txt|json|ya?ml|csv|log|[cm]?[jt]sx?|py|go|rs|sh|sql|css|xml|svg)$/i.test(file.name) ||
    file.mimeType === 'application/json';
  const tooLarge = file.size > FILE_PREVIEW_LIMIT;
  const preview = useQuery({
    queryKey: [
      'conversation-file-preview',
      target.baseUrl,
      target.headers,
      account?.user.id,
      file.path,
      file.updatedAt,
      file.size,
    ],
    queryFn: async ({ signal }) => {
      const blob = await readStoredFile(target, file, signal);
      return text ? { text: await blob.text() } : { blob };
    },
    enabled: !tooLarge && (image || pdf || text),
    gcTime: 0,
    retry: false,
  });
  const download = useMutation({ mutationFn: () => downloadStoredFile(target, file) });
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Button variant="ghost" size="icon-sm" aria-label={t('Back to files')} onClick={onBack}>
          <IconArrowLeft />
        </Button>
        <Txt variant="label" className="min-w-0 flex-1 truncate" title={file.name}>
          {file.name}
        </Txt>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t('Download {name}', { name: file.name })}
          disabled={download.isPending}
          onClick={() => download.mutate()}
        >
          <IconCloudDownload />
        </Button>
      </div>
      {download.isError && (
        <Txt role="alert" className="px-4">
          {download.error.message}
        </Txt>
      )}
      <div className="min-h-0 flex-1 overflow-auto p-4">
        {tooLarge ? (
          <Txt tone="muted">{t('This file is too large to preview. Download it to view.')}</Txt>
        ) : !text && !image && !pdf ? (
          <Txt tone="muted">{t('Preview is unavailable for this file. Download it to view.')}</Txt>
        ) : preview.isPending ? (
          <Txt tone="muted">{t('Loading...')}</Txt>
        ) : preview.isError ? (
          <div className="space-y-3">
            <Txt role="alert">{preview.error.message}</Txt>
            <Button size="sm" onClick={() => void preview.refetch()}>
              {t('Retry')}
            </Button>
          </div>
        ) : preview.data?.text !== undefined ? (
          /\.md$/i.test(file.name) || file.mimeType === 'text/markdown' ? (
            <MarkdownRenderer>{preview.data.text}</MarkdownRenderer>
          ) : (
            <pre className="font-mono text-label break-words whitespace-pre-wrap">{preview.data.text}</pre>
          )
        ) : preview.data?.blob ? (
          <ConversationBinaryPreview key={preview.dataUpdatedAt} blob={preview.data.blob} name={file.name} pdf={pdf} />
        ) : null}
      </div>
    </div>
  );
}
