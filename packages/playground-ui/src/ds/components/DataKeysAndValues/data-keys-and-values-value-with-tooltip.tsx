import { dataKeysAndValuesValueStyles } from './shared';
import { cn } from '@/lib/utils';

export interface DataKeysAndValuesValueWithTooltipProps {
  className?: string;
  children: React.ReactNode;
  tooltip: string;
}

export function DataKeysAndValuesValueWithTooltip({
  className,
  children,
  tooltip: _tooltip,
}: DataKeysAndValuesValueWithTooltipProps) {
  return (
    <dd className={cn(dataKeysAndValuesValueStyles, className)}>
      <div className="inline truncate">{children}</div>
    </dd>
  );
}
