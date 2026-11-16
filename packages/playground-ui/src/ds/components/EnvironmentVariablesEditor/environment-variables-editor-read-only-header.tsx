import { use } from 'react';
import { EnvironmentVariablesEditorReadOnlyListContext } from './environment-variables-editor-context';
import type { EnvironmentVariablesEditorReadOnlyHeaderProps } from './environment-variables-editor.types';

import { DataList } from '@/ds/components/DataList/data-list';
import { t as studioT, useLocale } from '@/lib/i18n';

export function EnvironmentVariablesEditorReadOnlyHeader({
  className,
  nameLabel = studioT('Key'),
  valueLabel = studioT('Value'),
  updatedAtLabel = studioT('Last Updated'),
  ...props
}: EnvironmentVariablesEditorReadOnlyHeaderProps) {
  useLocale();
  const { showIcon } = use(EnvironmentVariablesEditorReadOnlyListContext);

  return (
    <DataList.Top className={className} {...props}>
      {showIcon && (
        <DataList.TopCell aria-hidden="true" className="justify-center">
          <span />
        </DataList.TopCell>
      )}
      <DataList.TopCell>{nameLabel}</DataList.TopCell>
      <DataList.TopCell>{valueLabel}</DataList.TopCell>
      <DataList.TopCell className="justify-end">{updatedAtLabel}</DataList.TopCell>
    </DataList.Top>
  );
}
