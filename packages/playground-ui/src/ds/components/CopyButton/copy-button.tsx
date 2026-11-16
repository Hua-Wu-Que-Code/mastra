import type { ButtonProps, IconButtonSize } from '../Button';
import { Button } from '../Button';
import { IconCheckmark2Medium } from '@/ds/icons/central/IconCheckmark2Medium';
import { IconSquareBehindSquare1 } from '@/ds/icons/central/IconSquareBehindSquare1';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { t as studioT, useLocale } from '@/lib/i18n';

export type CopyButtonProps = {
  content: string;
  copyMessage?: string;
  showToast?: boolean;
  tooltip?: string;
  className?: string;
  size?: IconButtonSize;
  variant?: ButtonProps['variant'];
  disabled?: boolean;
};

export function CopyButton({
  content,
  copyMessage,
  showToast,
  tooltip = studioT('Copy to clipboard'),
  size = 'icon-sm',
  variant,
  className,
  disabled,
}: CopyButtonProps) {
  useLocale();
  const { isCopied, handleCopy } = useCopyToClipboard({
    text: content,
    copyMessage,
    showToast,
  });

  return (
    <Button
      onClick={handleCopy}
      type="button"
      size={size}
      variant={variant}
      className={className}
      disabled={disabled}
      tooltip={isCopied ? studioT('Copied!') : tooltip}
      aria-label={isCopied ? studioT('Copied!') : tooltip}
    >
      {isCopied ? <IconCheckmark2Medium /> : <IconSquareBehindSquare1 />}
    </Button>
  );
}
