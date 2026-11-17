import { t as studioT, useLocale } from '@/lib/i18n';

/** A figure without a price: said so rather than shown as $0. */
export function BreakdownNotPriced() {
  useLocale();
  return <span aria-label={studioT('No price for this model')}>{studioT('Not priced')}</span>;
}
