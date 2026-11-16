import {
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxRoot,
  ComboboxSeparator,
} from '@mastra/playground-ui/components/Combobox';
import { Field, FieldLabel } from '@mastra/playground-ui/components/Field';
import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';

import { sameValue } from './experiment-trigger-options';
import type { FieldPopupContainer, TargetOption } from './experiment-trigger-options';

const TARGET_GROUPS: { type: TargetOption['type']; label: string }[] = [
  {
    type: 'agent',
    get label() {
      return studioT('Agents');
    },
  },
  {
    type: 'workflow',
    get label() {
      return studioT('Workflows');
    },
  },
  {
    type: 'scorer',
    get label() {
      return studioT('Scorers');
    },
  },
];

type TargetGroup = { value: string; items: TargetOption[] };

/** The options grouped by kind, leaving out kinds with nothing to run. */
function groupTargets(options: TargetOption[]): TargetGroup[] {
  return TARGET_GROUPS.map(group => ({
    value: group.label,
    items: options.filter(option => option.type === group.type),
  })).filter(group => group.items.length > 0);
}

export interface TargetFieldProps {
  options: TargetOption[];
  isLoading: boolean;
  target?: TargetOption;
  onTargetValueChange: (targetValue: string) => void;
  container: FieldPopupContainer;
  className?: string;
}

export function TargetField({
  options,
  isLoading,
  target,
  onTargetValueChange,
  container,
  className,
}: TargetFieldProps) {
  useLocale();
  return (
    <Field className={className}>
      <FieldLabel
        required
        info={studioT('What runs on each item: an agent, a workflow, or a scorer you want to test.')}
      >
        {studioT('Target')}
      </FieldLabel>
      <ComboboxRoot
        items={groupTargets(options)}
        value={target ?? null}
        onValueChange={(next: TargetOption | null) => onTargetValueChange(next?.value ?? '')}
        isItemEqualToValue={sameValue}
        disabled={isLoading}
        autoHighlight
      >
        <ComboboxInput placeholder={studioT('Pick an agent, workflow or scorer')} />
        <ComboboxContent container={container}>
          <ComboboxEmpty>{studioT('Nothing to run')}</ComboboxEmpty>
          <ComboboxList>
            {(group: TargetGroup, index: number) => (
              <ComboboxGroup key={group.value} items={group.items}>
                {index > 0 ? <ComboboxSeparator /> : null}
                <ComboboxLabel>{group.value}</ComboboxLabel>
                <ComboboxCollection>
                  {(item: TargetOption) => (
                    <ComboboxItem key={item.value} value={item}>
                      {item.label}
                    </ComboboxItem>
                  )}
                </ComboboxCollection>
              </ComboboxGroup>
            )}
          </ComboboxList>
        </ComboboxContent>
      </ComboboxRoot>
    </Field>
  );
}
