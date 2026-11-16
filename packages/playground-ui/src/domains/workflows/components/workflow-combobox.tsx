import { useWorkflows } from '@mastra/react/hooks/workflows';
import { useEffect } from 'react';
import { Combobox } from '@/ds/components/Combobox';
import type { ComboboxProps } from '@/ds/components/Combobox';
import { useLinkComponent } from '@/lib/framework';

import { t as studioT, useLocale } from '@/lib/i18n';
import { toast } from '@/utils/toast';

export interface WorkflowComboboxProps {
  requestContext?: Record<string, any>;
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
}

export function WorkflowCombobox({
  value,
  onValueChange,
  placeholder = studioT('Select a workflow'),
  searchPlaceholder = studioT('Search workflows'),
  emptyText = studioT('No workflows found.'),
  className,
  disabled = false,
  variant,
  size,
  popupWidth,
  'aria-label': ariaLabel,
  align,
  requestContext,
}: WorkflowComboboxProps) {
  const studioLocale = useLocale();
  const { data: workflows = {}, isLoading, isError, error } = useWorkflows({ requestContext });
  const { navigate, paths } = useLinkComponent();

  useEffect(() => {
    if (isError) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load workflows';
      toast.error(studioT('Error loading workflows: {value0}', { value0: errorMessage }));
    }
  }, [isError, error, studioLocale]);

  const workflowOptions = Object.keys(workflows).map(key => ({
    label: workflows[key]?.name || key,
    value: key,
  }));

  const handleValueChange = (newWorkflowId: string) => {
    if (onValueChange) {
      onValueChange(newWorkflowId);
    } else if (newWorkflowId && newWorkflowId !== value) {
      navigate(paths.workflowLink(newWorkflowId));
    }
  };

  return (
    <Combobox
      options={workflowOptions}
      value={value}
      onValueChange={handleValueChange}
      placeholder={isLoading ? studioT('Loading workflows...') : placeholder}
      searchPlaceholder={searchPlaceholder}
      emptyText={emptyText}
      className={className}
      disabled={disabled || isLoading || isError}
      variant={variant}
      size={size}
      popupWidth={popupWidth}
      aria-label={ariaLabel}
      align={align}
    />
  );
}
