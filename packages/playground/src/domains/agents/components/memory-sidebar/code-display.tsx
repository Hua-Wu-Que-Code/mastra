import { Code } from '@mastra/playground-ui/components/Code';
import { ScrollArea } from '@mastra/playground-ui/components/ScrollArea';
import { Txt } from '@mastra/playground-ui/components/Txt';

import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';
import { focusRingInset } from '@mastra/playground-ui/primitives/transitions';

interface CodeDisplayProps {
  content: string;
  height?: string;
  isCopied?: boolean;
  isDraft?: boolean;
  onCopy?: () => void;
  className?: string;
}

export function CodeDisplay({
  content,
  height = '150px',
  isCopied = false,
  isDraft = false,
  onCopy,
  className = '',
}: CodeDisplayProps) {
  useLocale();
  return (
    <div className={`rounded-md border ${className}`} style={{ height }}>
      <ScrollArea className="h-full">
        <div className={`group relative p-2 ${onCopy ? 'cursor-pointer hover:bg-fill-subtle' : ''}`}>
          {onCopy && (
            <button
              type="button"
              onClick={onCopy}
              aria-label={studioT('Copy code')}
              className={`absolute inset-0 z-10 rounded-md ${focusRingInset}`}
            />
          )}
          <Code className="pointer-events-none text-meta whitespace-pre-wrap" code={content} />
          {isDraft && (
            <div className="mt-1.5">
              <Txt
                as="span"
                variant="meta"
                className="rounded-full bg-warning-subtle px-1.5 py-0.5 text-warning-subtle-foreground"
              >
                {studioT('Draft: save changes to apply')}
              </Txt>
            </div>
          )}
          {isCopied && (
            <Txt
              as="span"
              variant="meta"
              className="pointer-events-none absolute top-2 right-2 z-20 rounded-full bg-success-subtle px-1.5 py-0.5 text-success-subtle-foreground"
            >
              {studioT('Copied!')}
            </Txt>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
