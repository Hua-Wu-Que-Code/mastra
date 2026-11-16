import { Combobox } from '@mastra/playground-ui/components/Combobox';
import type { ComboboxProps } from '@mastra/playground-ui/components/Combobox';
import { useLinkComponent } from '@mastra/playground-ui/lib/framework';

import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';
import { toast } from '@mastra/playground-ui/utils/toast';
import { useMCPServers } from '@mastra/react/hooks/mcps';
import { useEffect } from 'react';

export interface MCPServerComboboxProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  disabled?: boolean;
  variant?: ComboboxProps['variant'];
  size?: ComboboxProps['size'];
  popupWidth?: ComboboxProps['popupWidth'];
  'aria-label'?: string;
  align?: ComboboxProps['align'];
  container?: HTMLElement | ShadowRoot | null | React.RefObject<HTMLElement | ShadowRoot | null>;
}

export function MCPServerCombobox({
  value,
  onValueChange,
  placeholder = studioT('Select an MCP server'),
  searchPlaceholder = studioT('Search MCP servers'),
  emptyText = studioT('No MCP servers found.'),
  className,
  disabled = false,
  variant,
  size,
  popupWidth,
  'aria-label': ariaLabel,
  align,
  container,
}: MCPServerComboboxProps) {
  const studioLocale = useLocale();
  const { data: mcpServers = [], isLoading, isError, error } = useMCPServers();
  const { navigate, paths } = useLinkComponent();

  useEffect(() => {
    if (isError) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load MCP servers';
      toast.error(studioT('Error loading MCP servers: {value0}', { value0: errorMessage }));
    }
  }, [isError, error, studioLocale]);

  const mcpServerOptions = mcpServers.map(server => ({
    label: server.name,
    value: server.id,
  }));

  const handleValueChange = (newServerId: string) => {
    if (onValueChange) {
      onValueChange(newServerId);
    } else if (newServerId && newServerId !== value) {
      navigate(paths.mcpServerLink(newServerId));
    }
  };

  return (
    <Combobox
      options={mcpServerOptions}
      value={value}
      onValueChange={handleValueChange}
      placeholder={isLoading ? studioT('Loading MCP servers...') : placeholder}
      searchPlaceholder={searchPlaceholder}
      emptyText={emptyText}
      className={className}
      disabled={disabled || isLoading || isError}
      variant={variant}
      size={size}
      popupWidth={popupWidth}
      aria-label={ariaLabel}
      align={align}
      container={container}
    />
  );
}
