import { useMastraClient } from '@mastra/react';
import { Download, Eye, FileText } from 'lucide-react';
import { useContext, useState } from 'react';
import { z } from 'zod';
import { ChatOpenFileContext } from '../context/chat-context';
import { Button } from '@/ds/components/Button';
import { Txt } from '@/ds/components/Txt';
import { Icon } from '@/ds/icons/Icon';
import { messageSurfaceStyle } from '@/ds/primitives/message-surface';
import { t, useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const fileSchema = z.object({
  path: z.string().min(1),
  name: z.string(),
  size: z.number().nonnegative(),
  mimeType: z.string(),
  description: z.string().optional(),
});
const outputSchema = z.object({ files: z.array(fileSchema).min(1).max(8) });

function PresentedFileCard({ file }: { file: z.infer<typeof fileSchema> }) {
  const client = useMastraClient();
  const openFile = useContext(ChatOpenFileContext);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const download = async () => {
    if (pending) return;
    setPending(true);
    setError('');
    try {
      // Never send authentication to a model-provided download URL. Use the configured host.
      const url = new URL(`${client.options.baseUrl.replace(/\/$/, '')}/storage/download`);
      url.searchParams.set('path', file.path);
      const fetcher = client.options.fetch ?? fetch;
      const response = await fetcher(url.href, {
        credentials: 'include',
        redirect: 'error',
        cache: 'no-store',
        headers: client.options.headers,
      });
      if (!response.ok)
        throw new Error(
          response.status === 404 ? t('This file is no longer available.') : t('File download failed. Please retry.'),
        );
      const blobUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = file.name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (error) {
      setError(error instanceof Error ? error.message : t('File download failed. Please retry.'));
    } finally {
      setPending(false);
    }
  };
  const size =
    file.size < 1024
      ? `${file.size} B`
      : file.size < 1024 * 1024
        ? `${(file.size / 1024).toFixed(1)} KB`
        : `${(file.size / 1024 / 1024).toFixed(1)} MB`;
  return (
    <div className={cn(messageSurfaceStyle, 'w-full min-w-0 px-3 py-2.5')}>
      <div className="flex min-w-0 items-center gap-2.5">
        <Icon size="md" className="shrink-0 text-muted-foreground">
          <FileText aria-hidden="true" />
        </Icon>
        <div className="min-w-0 flex-1">
          <Txt variant="body-sm" className="truncate">
            {file.name}
          </Txt>
          <Txt variant="meta" tone="muted">
            {size}
          </Txt>
        </div>
        {openFile && (
          <Button
            variant="ghost"
            size="icon-md"
            aria-label={t('Preview {name}', { name: file.name })}
            onClick={() => openFile(file.path)}
          >
            <Eye />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-md"
          disabled={pending}
          aria-label={t('Download {name}', { name: file.name })}
          onClick={() => void download()}
        >
          <Download />
        </Button>
      </div>
      {file.description && (
        <Txt variant="body-sm" tone="muted" className="mt-2">
          {file.description}
        </Txt>
      )}
      {error && (
        <Txt role="alert" variant="meta" className="text-destructive mt-2">
          {error}
        </Txt>
      )}
    </div>
  );
}

export function PresentTool({ output }: { output: unknown }) {
  useLocale();
  const [expanded, setExpanded] = useState(false);
  const result = outputSchema.safeParse(output);
  if (!result.success) return null;
  const { files } = result.data;
  return (
    <section aria-label={t('Delivered files')} className="@container min-w-0 space-y-2">
      <div className={cn('grid gap-2', files.length > 1 && '@min-[34rem]:grid-cols-2')}>
        {(expanded ? files : files.slice(0, 4)).map(file => (
          <PresentedFileCard key={file.path} file={file} />
        ))}
      </div>
      {files.length > 4 && (
        <Button variant="ghost" size="sm" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>
          {expanded ? t('Show fewer files') : t('Show {count} more files', { count: files.length - 4 })}
        </Button>
      )}
    </section>
  );
}
