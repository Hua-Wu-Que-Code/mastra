'use client';

import { Combobox } from '@mastra/playground-ui/components/Combobox';
import type { ComboboxProps } from '@mastra/playground-ui/components/Combobox';
import { useLinkComponent } from '@mastra/playground-ui/lib/framework';

import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';
import { toast } from '@mastra/playground-ui/utils/toast';
import { useDatasets } from '@mastra/react/hooks/datasets';
import { useEffect } from 'react';

export interface DatasetComboboxProps {
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
  container?: ComboboxProps['container'];
}

export function DatasetCombobox({
  value,
  onValueChange,
  placeholder = studioT('Select a dataset'),
  searchPlaceholder = studioT('Search datasets'),
  emptyText = studioT('No datasets found.'),
  className,
  disabled = false,
  variant,
  size,
  popupWidth,
  'aria-label': ariaLabel,
  align,
  container,
}: DatasetComboboxProps) {
  const studioLocale = useLocale();
  const { data, isLoading, isError, error } = useDatasets();
  const { navigate, paths } = useLinkComponent();

  useEffect(() => {
    if (isError) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load datasets';
      toast.error(studioT('Error loading datasets: {value0}', { value0: errorMessage }));
    }
  }, [isError, error, studioLocale]);

  const datasets = data?.datasets ?? [];
  const datasetOptions = datasets.map(d => ({
    label: d.name,
    value: d.id,
  }));

  const handleValueChange = (newDatasetId: string) => {
    if (onValueChange) {
      onValueChange(newDatasetId);
    } else if (newDatasetId && newDatasetId !== value) {
      navigate(paths.datasetLink(newDatasetId));
    }
  };

  return (
    <Combobox
      options={datasetOptions}
      value={value}
      onValueChange={handleValueChange}
      placeholder={isLoading ? studioT('Loading datasets...') : placeholder}
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
