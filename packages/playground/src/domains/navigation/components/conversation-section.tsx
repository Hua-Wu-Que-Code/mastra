import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@mastra/playground-ui/components/Collapsible';
import { DisclosureChevron } from '@mastra/playground-ui/components/DisclosureChevron';
import { Sidebar } from '@mastra/playground-ui/components/Sidebar';
import type { ReactNode } from 'react';
import { useId } from 'react';

export function ConversationSection({
  label,
  collapsed,
  onToggle,
  actions,
  children,
}: {
  label: string;
  collapsed: boolean;
  onToggle: () => void;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <Collapsible
      render={<section aria-labelledby={id} className="mt-3.5 min-w-0" />}
      open={!collapsed}
      onOpenChange={onToggle}
    >
      <Sidebar.NavHeader action={actions}>
        <CollapsibleTrigger id={id} className="inline-flex min-h-7 items-center gap-1">
          {label}
          <DisclosureChevron direction="right" className="size-3" />
        </CollapsibleTrigger>
      </Sidebar.NavHeader>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  );
}
