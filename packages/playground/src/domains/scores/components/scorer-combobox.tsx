import { Combobox } from '@mastra/playground-ui/components/Combobox';
import type { ComboboxProps } from '@mastra/playground-ui/components/Combobox';
import { useLinkComponent } from '@mastra/playground-ui/lib/framework';

import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';
import { toast } from '@mastra/playground-ui/utils/toast';
import { useEffect } from 'react';
import { useScorers } from '../hooks/use-scorers';

export interface ScorerComboboxProps {
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

export function ScorerCombobox({
  value,
  onValueChange,
  placeholder = studioT('Select a scorer'),
  searchPlaceholder = studioT('Search scorers'),
  emptyText = studioT('No scorers found.'),
  className,
  disabled = false,
  variant,
  size,
  popupWidth,
  'aria-label': ariaLabel,
  align,
}: ScorerComboboxProps) {
  const studioLocale = useLocale();
  const { data: scorers = {}, isLoading, isError, error } = useScorers();
  const { navigate, paths } = useLinkComponent();

  useEffect(() => {
    if (isError) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load scorers';
      toast.error(studioT('Error loading scorers: {value0}', { value0: errorMessage }));
    }
  }, [isError, error, studioLocale]);

  const scorerOptions = Object.keys(scorers).map(key => ({
    label: scorers[key]?.scorer.config.name || key,
    value: key,
  }));

  const handleValueChange = (newScorerId: string) => {
    if (onValueChange) {
      onValueChange(newScorerId);
    } else if (newScorerId && newScorerId !== value) {
      navigate(paths.scorerLink(newScorerId));
    }
  };

  return (
    <Combobox
      options={scorerOptions}
      value={value}
      onValueChange={handleValueChange}
      placeholder={isLoading ? studioT('Loading scorers...') : placeholder}
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
