import { dataKeysAndValuesValueStyles } from './shared';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ds/components/Tooltip';
import { IconCheckmark2Medium } from '@/ds/icons/central/IconCheckmark2Medium';
import { IconSquareBehindSquare1 } from '@/ds/icons/central/IconSquareBehindSquare1';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';

import { t as studioT, useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export interface DataKeysAndValuesValueWithCopyBtnProps {
  className?: string;
  children: React.ReactNode;
  copyValue: string;
  copyTooltip?: string;
}

export function DataKeysAndValuesValueWithCopyBtn({
  className,
  children,
  copyValue,
  copyTooltip = studioT('Copy to clipboard'),
}: DataKeysAndValuesValueWithCopyBtnProps) {
  useLocale();
  const { isCopied, handleCopy } = useCopyToClipboard({
    text: copyValue,
    copyMessage: studioT('Copied!'),
  });

  return (
    <dd className={cn(dataKeysAndValuesValueStyles, className)}>
      <Tooltip open={isCopied || undefined}>
        <TooltipTrigger asChild>
          <button
            onClick={handleCopy}
            type="button"
            className={cn(
              'flex max-w-full items-center gap-2 text-left whitespace-nowrap',
              '[&:hover>svg]:opacity-100 [&>svg]:size-icon-xs [&>svg]:shrink-0 [&>svg]:opacity-70',
              { '[&>svg]:size-icon-md [&>svg]:text-success-indicator': isCopied },
            )}
            aria-label={isCopied ? studioT('Copied!') : copyTooltip}
          >
            <span className="min-w-0 truncate">{children}</span>
            {isCopied ? <IconCheckmark2Medium /> : <IconSquareBehindSquare1 />}
          </button>
        </TooltipTrigger>
        <TooltipContent>{isCopied ? studioT('Copied!') : copyTooltip}</TooltipContent>
      </Tooltip>
    </dd>
  );
}
