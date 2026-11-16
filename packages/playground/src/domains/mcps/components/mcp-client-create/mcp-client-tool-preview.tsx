import {
  Entity,
  EntityContent,
  EntityDescription,
  EntityIcon,
  EntityName,
} from '@mastra/playground-ui/components/Entity';
import { Notice } from '@mastra/playground-ui/components/Notice';
import { Spinner } from '@mastra/playground-ui/components/Spinner';
import { Switch } from '@mastra/playground-ui/components/Switch';
import { Txt } from '@mastra/playground-ui/components/Txt';
import { Icon } from '@mastra/playground-ui/icons/Icon';
import { McpServerIcon } from '@mastra/playground-ui/icons/McpServerIcon';
import { ToolsIcon } from '@mastra/playground-ui/icons/ToolsIcon';

import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';

import { Trans } from '@mastra/playground-ui/lib/i18n/trans';
import { passwordManagerOptOutProps } from '@mastra/playground-ui/primitives/password-manager-autofill';
import { cn } from '@mastra/playground-ui/utils/cn';
import type { TryConnectMcpMutation } from '@mastra/react/hooks/mcps';

interface MCPClientToolPreviewProps {
  serverType: 'stdio' | 'http';
  url: string;
  tryConnect: TryConnectMcpMutation;
  selectedTools?: Record<string, { description?: string }>;
  onToggleTool?: (toolName: string, description?: string) => void;
  onDescriptionChange?: (toolName: string, description: string) => void;
}

export function MCPClientToolPreview({
  serverType,
  url,
  tryConnect,
  selectedTools,
  onToggleTool,
  onDescriptionChange,
}: MCPClientToolPreviewProps) {
  useLocale();
  if (serverType === 'stdio') {
    return (
      <EmptyState>
        <Txt tone="muted">
          {studioT('Tool preview is available for HTTP servers. Stdio servers cannot be previewed.')}
        </Txt>
      </EmptyState>
    );
  }

  if (!url.trim()) {
    return (
      <EmptyState>
        <Txt tone="muted">{studioT('Enter a URL and click "Try to connect" to preview available tools.')}</Txt>
      </EmptyState>
    );
  }

  if (tryConnect.isIdle) {
    return (
      <EmptyState>
        <Txt tone="muted">{studioT('Click "Try to connect" to preview available tools.')}</Txt>
      </EmptyState>
    );
  }

  return (
    <div className="p-5">
      {tryConnect.isPending && (
        <div className="flex items-center gap-2">
          <Spinner className="h-3 w-3" />
          <Txt tone="muted">{studioT('Connecting...')}</Txt>
        </div>
      )}

      {tryConnect.isError && (
        <div role="alert">
          <Notice variant="destructive">
            {tryConnect.error instanceof Error ? tryConnect.error.message : studioT('Connection failed')}
          </Notice>
        </div>
      )}

      {tryConnect.isSuccess && tryConnect.data.tools.length === 0 && (
        <Txt tone="muted">{studioT('Connected successfully but no tools were found.')}</Txt>
      )}

      {tryConnect.isSuccess && tryConnect.data.tools.length > 0 && (
        <ToolList
          tools={tryConnect.data.tools}
          selectedTools={selectedTools}
          onToggleTool={onToggleTool}
          onDescriptionChange={onDescriptionChange}
        />
      )}
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full items-center justify-center p-5 text-center">{children}</div>;
}

function ToolList({
  tools,
  selectedTools = {},
  onToggleTool,
  onDescriptionChange,
}: {
  tools: { name: string; description?: string }[];
  selectedTools?: Record<string, { description?: string }>;
  onToggleTool?: (toolName: string, description?: string) => void;
  onDescriptionChange?: (toolName: string, description: string) => void;
}) {
  useLocale();
  const selectedCount = Object.keys(selectedTools).length;

  return (
    <div className="overflow-y-auto p-5">
      <div className="flex items-center gap-2 text-foreground">
        <Icon size="lg" className="rounded-md bg-muted p-1">
          <McpServerIcon />
        </Icon>
        <Txt variant="heading" as="h2">
          <Trans
            id="Available Tools ( {part0}/{part1} selected)"
            values={{ part0: selectedCount, part1: tools.length }}
          />
        </Txt>
      </div>

      <div className="flex flex-col gap-2 pt-4">
        {tools.map(tool => {
          const isSelected = tool.name in selectedTools;
          const isDisabled = !onDescriptionChange || !isSelected;

          return (
            <Entity key={tool.name}>
              <EntityIcon>
                <ToolsIcon className="group-hover/entity:text-warning-foreground" />
              </EntityIcon>
              <EntityContent>
                <EntityName>{tool.name}</EntityName>
                <EntityDescription>
                  <input
                    type="text"
                    {...passwordManagerOptOutProps}
                    disabled={isDisabled}
                    className={cn(
                      'block w-full appearance-none border border-transparent bg-transparent text-muted-foreground',
                      !isDisabled && 'border-dashed border-border',
                    )}
                    value={
                      isSelected
                        ? (selectedTools[tool.name]?.description ?? tool.description ?? '')
                        : (tool.description ?? '')
                    }
                    onChange={e => onDescriptionChange?.(tool.name, e.target.value)}
                  />
                </EntityDescription>
              </EntityContent>
              {onToggleTool && (
                <Switch checked={isSelected} onCheckedChange={() => onToggleTool(tool.name, tool.description)} />
              )}
            </Entity>
          );
        })}
      </div>
    </div>
  );
}
