import { Badge } from '@mastra/playground-ui/components/Badge';
import { Combobox } from '@mastra/playground-ui/components/Combobox';
import type { ComboboxProps } from '@mastra/playground-ui/components/Combobox';

import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';
import { formatDate } from '@mastra/playground-ui/utils/date-format';
import { useScorerVersions } from '@mastra/react/hooks/scores';

export interface ScorerVersionComboboxProps {
  scorerId: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  disabled?: boolean;
  variant?: ComboboxProps['variant'];
  activeVersionId?: string;
}

export function ScorerVersionCombobox({
  scorerId,
  value,
  onValueChange,
  className,
  disabled = false,
  variant,
  activeVersionId,
}: ScorerVersionComboboxProps) {
  useLocale();
  const { data, isLoading } = useScorerVersions({
    scorerId,
    params: { orderBy: { direction: 'DESC' } },
    queryOptions: { enabled: !!scorerId },
  });

  const versions = data?.versions ?? [];

  const activeVersion = activeVersionId ? versions.find(v => v.id === activeVersionId) : undefined;
  const activeVersionNumber = activeVersion?.versionNumber;

  const options = [
    { label: studioT('Latest'), value: '' },
    ...versions.map(version => {
      const isPublished = version.id === activeVersionId;
      const isDraft = activeVersionNumber !== undefined && version.versionNumber > activeVersionNumber;

      return {
        label: studioT('v{value0}', { value0: version.versionNumber }),
        value: version.id,
        description: formatDate(version.createdAt, 'date-time') ?? '',
        end: isPublished ? (
          <Badge variant="success">{studioT('Published')}</Badge>
        ) : isDraft ? (
          <Badge variant="info">{studioT('Draft')}</Badge>
        ) : undefined,
      };
    }),
  ];

  return (
    <Combobox
      options={options}
      value={value}
      onValueChange={onValueChange}
      placeholder={isLoading ? studioT('Loading versions...') : studioT('Versions')}
      searchPlaceholder={studioT('Search versions')}
      emptyText={studioT('No versions found.')}
      className={className}
      disabled={disabled || isLoading}
      variant={variant}
    />
  );
}
