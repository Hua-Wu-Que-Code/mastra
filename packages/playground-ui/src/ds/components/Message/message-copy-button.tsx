import { Button } from '../Button';
import { IconCheckmark2Medium } from '@/ds/icons/central/IconCheckmark2Medium';
import { DshCopy } from '@/ds/icons/dsh/DshCopy';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { t, useLocale } from '@/lib/i18n';

export function MessageCopyButton({ text }: { text: string }) {
  useLocale();
  const { isCopied, handleCopy } = useCopyToClipboard({ text, showToast: false });
  return (
    <Button
      type="button"
      size="icon-sm"
      variant="ghost"
      onClick={handleCopy}
      aria-label={isCopied ? t('Copied!') : t('Copy message')}
      title={isCopied ? t('Copied!') : t('Copy message')}
    >
      {isCopied ? <IconCheckmark2Medium /> : <DshCopy />}
    </Button>
  );
}
