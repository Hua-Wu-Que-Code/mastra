import type { ReactNode } from 'react';
import { Button } from '@/ds/components/Button';
import { DropdownMenu } from '@/ds/components/DropdownMenu';
import { IconDotGrid1x3Vertical } from '@/ds/icons/central/IconDotGrid1x3Vertical';
import { t as studioT, useLocale } from '@/lib/i18n';

export function WorkflowStepActions({ children }: { children: ReactNode }) {
  useLocale();
  return (
    <DropdownMenu>
      <DropdownMenu.Trigger
        render={
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={studioT('Step actions')}
            title={studioT('Step actions')}
            className="nodrag nopan"
          >
            <IconDotGrid1x3Vertical />
          </Button>
        }
      />
      <DropdownMenu.Content align="end">{children}</DropdownMenu.Content>
    </DropdownMenu>
  );
}
