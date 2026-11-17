import type { ReactNode } from 'react';
import type { ModelPickerModel, ModelPickerProvider } from './model-picker-types';
import { Badge } from '@/ds/components/Badge';
import { CommandItem } from '@/ds/components/Command';
import { IconCheckmark2Medium } from '@/ds/icons/central/IconCheckmark2Medium';

import { t as studioT, useLocale } from '@/lib/i18n';
import { formatModelName } from '@/utils/model';

interface ModelPickerOptionProps {
  provider: ModelPickerProvider;
  model: ModelPickerModel;
  selected: boolean;
  isDefault: boolean;
  onSelect: () => void;
  renderProviderIcon: (providerId: string) => ReactNode;
}

export function ModelPickerOption({
  provider,
  model,
  selected,
  isDefault,
  onSelect,
  renderProviderIcon,
}: ModelPickerOptionProps) {
  useLocale();
  const name = model.name ?? formatModelName(model.id);
  const icon = renderProviderIcon(provider.id);
  return (
    <CommandItem
      aria-description={model.id}
      value={`${provider.id}/${model.id}`}
      keywords={[provider.name, name]}

      onSelect={onSelect}
    >
      {icon && (
        <span aria-hidden className="flex shrink-0">
          {icon}
        </span>
      )}
      <span className="truncate">{name}</span>
      {isDefault ? (
        <Badge variant="blue" size="xs">
          {studioT('Default')}
        </Badge>
      ) : null}
      {selected ? <IconCheckmark2Medium aria-hidden className="ml-auto shrink-0" /> : null}
    </CommandItem>
  );
}
