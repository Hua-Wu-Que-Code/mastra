import { Button } from '@mastra/playground-ui/components/Button';
import { t, useLocale } from '@mastra/playground-ui/lib/i18n';
import { FileText, X } from 'lucide-react';
import type { StoredFileReference } from '@/domains/account/storage-api';

export function ComposerFileReferenceList({
  files,
  onRemove,
}: {
  files: readonly StoredFileReference[];
  onRemove: (path: string) => void;
}) {
  useLocale();
  if (!files.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 px-3 pt-2">
      {files.map(file => (
        <div key={file.path} className="bg-surface2 flex max-w-full items-center gap-1 rounded-lg pl-2 text-label">
          <FileText className="size-icon-xs shrink-0" aria-hidden />
          <span className="truncate" title={file.name}>
            @{file.name}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t('Remove reference to {name}', { name: file.name })}
            onClick={() => onRemove(file.path)}
          >
            <X />
          </Button>
        </div>
      ))}
    </div>
  );
}

export function FileReferenceSuggestions({
  files,
  index,
  pending,
  onSelect,
}: {
  files: readonly StoredFileReference[];
  index: number;
  pending: boolean;
  onSelect: (file: StoredFileReference) => void;
}) {
  useLocale();
  return (
    <div
      className="absolute inset-x-2 bottom-full z-20 mb-1 max-h-60 overflow-auto rounded-lg border border-border bg-popover p-1 text-label shadow-md"
      aria-label={t('Reference a file')}
    >
      {files.length ? (
        files.map((file, position) => (
          <Button
            key={file.path}
            type="button"
            variant="ghost"
            size="sm"
            className="data-[selected=true]:bg-surface2 w-full justify-start"
            data-selected={position === index}
            onMouseDown={event => event.preventDefault()}
            onClick={() => onSelect(file)}
            icon={<FileText />}
            title={file.name}
          >
            <span className="truncate">{file.name}</span>
          </Button>
        ))
      ) : (
        <div className="px-2 py-1.5 text-muted-foreground">{pending ? t('Loading...') : t('No files found.')}</div>
      )}
    </div>
  );
}
