import { InlineCode } from '@mastra/playground-ui/components/InlineCode';
import { Notice } from '@mastra/playground-ui/components/Notice';
import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';

export function RegisteredMemoryNotice({ memoryId }: { memoryId: string }) {
  useLocale();
  return (
    <Notice variant="info" title={studioT('Registered memory')}>
      <Notice.Message>
        {studioT('Uses registered memory') + ' '}
        <InlineCode>{memoryId}</InlineCode>
        {studioT(". Its settings are defined in code on the Altflow instance and can't be edited here.")}
      </Notice.Message>
    </Notice>
  );
}
