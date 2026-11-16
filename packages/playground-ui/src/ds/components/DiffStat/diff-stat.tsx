import { t as studioT, useLocale } from '@/lib/i18n';
import { pluralize } from '@/lib/string';
import { cn } from '@/lib/utils';

export interface DiffStatProps {
  additions: number;
  deletions: number;
  className?: string;
}

export function DiffStat({ additions, deletions, className }: DiffStatProps) {
  useLocale();
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1 tabular-nums', className)}>
      <span aria-hidden="true" className="text-success-indicator">
        +{additions}
      </span>
      <span aria-hidden="true" className="text-destructive-foreground">
        −{deletions}
      </span>
      <span className="sr-only">
        {studioT('{value0} and {value1}', {
          value0: pluralize(additions, 'addition'),
          value1: pluralize(deletions, 'deletion'),
        })}
      </span>
    </span>
  );
}
