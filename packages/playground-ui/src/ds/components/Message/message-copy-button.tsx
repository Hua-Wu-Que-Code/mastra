import { CopyButton } from '../CopyButton';
import { t as studioT, useLocale } from '@/lib/i18n';

export function MessageCopyButton({ text }: { text: string }) {
  useLocale();
  return (
    <CopyButton content={text} size="icon-sm" variant="ghost" tooltip={studioT('Copy message')} showToast={false} />
  );
}
