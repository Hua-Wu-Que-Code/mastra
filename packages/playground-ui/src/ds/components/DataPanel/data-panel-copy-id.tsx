import { useState } from 'react';
import { Button } from '@/ds/components/Button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ds/components/Tooltip';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';

import { t as studioT, useLocale } from '@/lib/i18n';
import { truncateString } from '@/lib/truncate-string';

export interface DataPanelCopyIdProps {
  id: string;
  /** Characters kept when the id is truncated. Defaults to 12. */
  maxLength?: number;
  /** Append `…` to a truncated id. Defaults to true. */
  ellipsis?: boolean;
  /** Leading icon (bare SVG) naming what the id identifies. */
  icon?: React.ReactNode;
}

/**
 * Truncated identifier rendered inline in a `DataPanel.Heading`; clicking copies the full value.
 */
export function DataPanelCopyId({ id, maxLength = 12, ellipsis = true, icon }: DataPanelCopyIdProps) {
  useLocale();
  const { isCopied, handleCopy } = useCopyToClipboard({ text: id, showToast: false });
  const [open, setOpen] = useState(false);

  return (
    <Tooltip open={isCopied || open} onOpenChange={setOpen}>
      <TooltipTrigger
        render={
          <Button type="button" variant="ghost" size="sm" icon={icon} onClick={handleCopy}>
            {ellipsis ? truncateString(id, maxLength) : id.slice(0, maxLength)}
          </Button>
        }
      />
      <TooltipContent>{isCopied ? studioT('Copied to clipboard') : studioT('Copy to clipboard')}</TooltipContent>
    </Tooltip>
  );
}
