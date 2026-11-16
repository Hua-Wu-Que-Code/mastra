import { useLinkComponent } from '@mastra/playground-ui/lib/framework';
import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';

import { HeaderCreateAction } from '@/components/ui/header-create-action';
import { useIsCmsAvailable } from '@/domains/cms/hooks/use-is-cms-available';

/** Renders the "New scorer" CTA for the page header of the scorers listing page. */
export function ScorersHeaderCreateAction() {
  useLocale();
  const { isCmsAvailable } = useIsCmsAvailable();
  const { paths } = useLinkComponent();
  if (!isCmsAvailable) return null;
  return (
    <HeaderCreateAction href={paths.cmsScorersCreateLink()} tooltip={studioT('Create a scorer')}>
      {studioT('New scorer')}
    </HeaderCreateAction>
  );
}
