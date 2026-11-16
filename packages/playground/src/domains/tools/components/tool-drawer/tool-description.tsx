import { CollapsibleBox, useCollapsibleBox } from '@mastra/playground-ui/components/CollapsibleBox';
import { MarkdownRenderer } from '@mastra/playground-ui/components/MarkdownRenderer';
import { useLocale, t as studioT } from '@mastra/playground-ui/lib/i18n';

export interface ToolDescriptionProps {
  description: string;
}

/** The tool's description as markdown, clipped with a fade and an expand button when it runs long. */
export function ToolDescription({ description }: ToolDescriptionProps) {
  useLocale();
  const box = useCollapsibleBox({ collapsedHeight: 140 });

  return (
    <CollapsibleBox state={box} expandLabel={studioT('Read more')}>
      <MarkdownRenderer>{description}</MarkdownRenderer>
    </CollapsibleBox>
  );
}
