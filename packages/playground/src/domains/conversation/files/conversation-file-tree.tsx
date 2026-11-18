import { Button } from '@mastra/playground-ui/components/Button';
import { Txt } from '@mastra/playground-ui/components/Txt';
import { IconFolder1 } from '@mastra/playground-ui/icons/central/IconFolder1';
import { Icon } from '@mastra/playground-ui/icons/Icon';
import type { StoredFile } from '@/domains/account/storage-api';

/** Group by path, not filename: identical names in different folders remain distinct. */
export function ConversationFileTree({
  files,
  onSelect,
  prefix = '/',
}: {
  files: StoredFile[];
  onSelect: (path: string) => void;
  prefix?: string;
}) {
  const folders = new Map<string, StoredFile[]>();
  const leaves: StoredFile[] = [];
  for (const file of files) {
    const rest = file.path.slice(prefix.length);
    const slash = rest.indexOf('/');
    if (slash === -1) leaves.push(file);
    else {
      const folder = rest.slice(0, slash);
      const children = folders.get(folder) ?? [];
      children.push(file);
      folders.set(folder, children);
    }
  }
  return (
    <ul className="space-y-1">
      {[...folders]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([folder, children]) => (
          <li key={folder}>
            <details open>
              <summary className="cursor-pointer rounded-lg px-2 py-1.5 text-label hover:bg-fill-subtle">
                <Icon size="sm" className="mr-2 inline-flex">
                  <IconFolder1 />
                </Icon>
                {folder}
              </summary>
              <div className="ml-4 border-l border-border pl-2">
                <ConversationFileTree files={children} prefix={`${prefix}${folder}/`} onSelect={onSelect} />
              </div>
            </details>
          </li>
        ))}
      {leaves
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
              <Txt as="span" variant="label" className="truncate text-inherit">
                {file.name}
              </Txt>
            </Button>
          </li>
        ))}
    </ul>
  );
}
