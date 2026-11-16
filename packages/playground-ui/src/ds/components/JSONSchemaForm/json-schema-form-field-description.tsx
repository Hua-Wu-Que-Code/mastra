import * as React from 'react';
import { Field, FieldLabel } from '../Field';
import { Input } from '../Input';
import type { InputProps } from '../Input';
import { useJSONSchemaFormField } from './json-schema-form-field-context';
import { t as studioT, useLocale } from '@/lib/i18n';

export type JSONSchemaFormFieldDescriptionProps = Omit<InputProps, 'value' | 'onChange' | 'name'> & {
  label?: React.ReactNode;
  labelIsHidden?: boolean;
};

export function FieldDescription({
  label = studioT('Description'),
  labelIsHidden = false,
  className,
  ...props
}: JSONSchemaFormFieldDescriptionProps) {
  useLocale();
  const { field, update } = useJSONSchemaFormField();

  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      update({ description: e.target.value });
    },
    [update],
  );

  return (
    <Field className={className}>
      <FieldLabel className={labelIsHidden ? 'sr-only' : undefined}>{label}</FieldLabel>
      <Input {...props} size="md" value={field.description || ''} onChange={handleChange} />
    </Field>
  );
}
