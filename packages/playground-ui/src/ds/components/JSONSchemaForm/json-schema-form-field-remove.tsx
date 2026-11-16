import * as React from 'react';
import { Button } from '../Button';
import type { ButtonProps } from '../Button';
import { useJSONSchemaFormField } from './json-schema-form-field-context';
import { TrashIcon } from '@/ds/icons/TrashIcon';
import { t as studioT, useLocale } from '@/lib/i18n';

export type JSONSchemaFormFieldRemoveProps = Omit<ButtonProps, 'onClick' | 'tooltip' | 'children' | 'size'> & {
  tooltip?: React.ReactNode;
  children?: React.ReactNode;
};

export function FieldRemove({ children, tooltip = studioT('Remove field'), ...props }: JSONSchemaFormFieldRemoveProps) {
  useLocale();
  const { remove } = useJSONSchemaFormField();

  return (
    <Button {...props} tooltip={tooltip} onClick={remove} size="icon-md">
      {children || <TrashIcon />}
    </Button>
  );
}
