import * as React from 'react';
import { useJSONSchemaForm } from './json-schema-form-context';
import { useJSONSchemaFormNestedContext } from './json-schema-form-nested-context';
import { Button } from '@/ds/components/Button';
import type { ButtonProps } from '@/ds/components/Button';
import { IconPlusMedium } from '@/ds/icons/central/IconPlusMedium';
import { t as studioT, useLocale } from '@/lib/i18n';

export type JSONSchemaFormAddFieldProps = Omit<ButtonProps, 'onClick'>;

export function AddField({ children, ...props }: JSONSchemaFormAddFieldProps) {
  useLocale();
  const { addField } = useJSONSchemaForm();
  const nestedContext = useJSONSchemaFormNestedContext();

  // Use nested context parentPath if available, otherwise add to root
  const parentPath = nestedContext?.parentPath;

  const handleClick = React.useCallback(() => {
    addField(parentPath ?? []);
  }, [addField, parentPath]);

  return (
    <Button icon={<IconPlusMedium />} type="button" {...props} onClick={handleClick}>
      {children || studioT('Add field')}
    </Button>
  );
}
