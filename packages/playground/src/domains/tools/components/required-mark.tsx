import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';

/** Same marker as a required form label (`FieldBlock.Label`), so the schema and the form read alike. */
export function RequiredMark() {
  useLocale();
  return (
    <>
      <span aria-hidden className="ml-0.5 text-destructive-indicator">
        *
      </span>
      <span className="sr-only"> {' ' + studioT('(required)')}</span>
    </>
  );
}
