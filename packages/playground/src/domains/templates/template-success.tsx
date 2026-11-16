import { KeyValueList } from '@mastra/playground-ui/components/KeyValueList';
import type { KeyValueListItemData } from '@mastra/playground-ui/components/KeyValueList';
import { Txt } from '@mastra/playground-ui/components/Txt';
import { IconPackage } from '@mastra/playground-ui/icons/central/IconPackage';

import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';

import { Trans } from '@mastra/playground-ui/lib/i18n/trans';
import { cn } from '@mastra/playground-ui/utils/cn';
import type { ComponentType } from 'react';
import { Container } from './shared';

type TemplateSuccessProps = {
  name: string;
  entities?: string[];
  installedEntities?: KeyValueListItemData[];
  linkComponent?: ComponentType<any>;
};

export function TemplateSuccess({ name, installedEntities }: TemplateSuccessProps) {
  useLocale();
  return (
    <Container className={cn('grid content-center items-center justify-items-center gap-4', '[&>svg]:h-8 [&>svg]:w-8')}>
      <IconPackage />
      <Txt as="h2" variant="heading">
        {studioT('Done!')}
      </Txt>
      <Txt tone="muted" className="text-center">
        <Trans
          id="The {part0} template has been successfully installed. {part1}"
          values={{
            part0: <b className="text-muted-foreground">{name}</b>,
            part1: installedEntities && installedEntities.length > 0 && (
              <>
                <br /> {' ' + studioT('Installed entities are listed below.')}
              </>
            ),
          }}
        />
      </Txt>
      {installedEntities && installedEntities.length > 0 && <KeyValueList data={installedEntities} />}
    </Container>
  );
}
