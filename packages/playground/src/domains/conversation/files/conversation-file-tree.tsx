import { Button } from '@mastra/playground-ui/components/Button';
import { Txt } from '@mastra/playground-ui/components/Txt';
import { IconFileText } from '@mastra/playground-ui/icons/central/IconFileText';
import type { StoredFile } from '@/domains/account/storage-api';

/** Flat conversation files. Path keys preserve distinct files with the same name. */
export function ConversationFileTree({ files, onSelect }: { files: StoredFile[]; onSelect: (path: string) => void }) {
  return (
    <ul className="space-y-1">
      {[...files]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(file => (
          <li key={file.path}>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              title={file.path}
              onClick={() => onSelect(file.path)}
            >
              <IconFileText />
              <Txt as="span" variant="label" className="truncate text-inherit">
                {file.name}
              </Txt>
            </Button>
          </li>
        ))}
    </ul>
  );
}
