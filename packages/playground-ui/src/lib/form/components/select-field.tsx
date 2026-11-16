import type { AutoFormFieldProps } from '@autoform/react';
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ds/components/Select';
import { t as studioT, useLocale } from '@/lib/i18n';

export const SelectField: React.FC<AutoFormFieldProps> = ({ field, inputProps, value }) => {
  useLocale();
  const { key: _key, ...props } = inputProps;

  return (
    <Select
      {...props}
      value={value}
      onValueChange={value => {
        const syntheticEvent = {
          target: {
            value,
            name: inputProps.name,
          },
        } as React.ChangeEvent<HTMLInputElement>;
        props.onChange(syntheticEvent);
      }}
    >
      <SelectTrigger>
        <SelectValue placeholder={studioT('Select an option')} />
      </SelectTrigger>
      <SelectContent>
        {(field.options || []).map(([key, label]) => (
          <SelectItem key={key} value={key}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
