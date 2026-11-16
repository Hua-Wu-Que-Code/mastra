import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';
import { titleCase } from './format-infrastructure-value';
import { InfrastructureDetailRow } from './infrastructure-detail-row';

export interface InfrastructureConfigRowsProps {
  entries: Array<{ key: string; value: string }>;
}

export const InfrastructureConfigRows = ({ entries }: InfrastructureConfigRowsProps) => {
  useLocale();
  return entries.map(entry => (
    <InfrastructureDetailRow
      key={entry.key}
      label={studioT('Config: {value0}', { value0: entry.key })}
      value={titleCase(entry.value)}
    />
  ));
};
