import { Txt } from '@mastra/playground-ui/components/Txt';
import { IconCrossMedium } from '@mastra/playground-ui/icons/central/IconCrossMedium';
import { IconEyeOpen } from '@mastra/playground-ui/icons/central/IconEyeOpen';
import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';
import { Trans } from '@mastra/playground-ui/lib/i18n/trans';

import { useRoleImpersonation } from '../hooks/use-role-impersonation';

/**
 * Banner shown when an admin is previewing the Studio as another role.
 * This is a UI-only preview — server calls still use real admin permissions.
 */
export function ImpersonationBanner() {
  useLocale();
  const { isImpersonating, impersonatedRole, stopImpersonation } = useRoleImpersonation();

  if (!isImpersonating || !impersonatedRole) return null;

  return (
    <div className="mx-3 mb-2 flex items-center gap-2 rounded-md border border-info-edge bg-info-subtle px-3 py-1.5">
      <IconEyeOpen className="size-icon-sm shrink-0 text-info-subtle-foreground" />
      <Txt variant="meta" className="truncate text-info-subtle-foreground">
        <Trans
          id="Previewing {part0} experience"
          values={{ part0: <span className="font-medium capitalize">{impersonatedRole.name}</span> }}
        />
      </Txt>
      <button
        type="button"
        onClick={stopImpersonation}
        className="ml-auto shrink-0 rounded p-0.5 text-info-subtle-foreground hover:bg-info-edge"
        title={studioT('Exit role preview')}
      >
        <IconCrossMedium className="size-icon-xs" />
      </button>
    </div>
  );
}
