import { Sidebar, useSidebar } from '@mastra/playground-ui/components/Sidebar';
import { Txt } from '@mastra/playground-ui/components/Txt';
import { IconArrowLeft } from '@mastra/playground-ui/icons/central/IconArrowLeft';
import { IconSettingsGear5 } from '@mastra/playground-ui/icons/central/IconSettingsGear5';
import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';
import { Link, useLocation } from 'react-router';

function returnPath(state: unknown): string {
  if (typeof state !== 'object' || state === null || !('returnTo' in state)) return '/';
  const path = state.returnTo;
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) return '/';
  if (/^\/settings(?:[/?#]|$)/.test(path)) return '/';
  return path;
}

export function SettingsSidebar() {
  useLocale();
  const { state } = useSidebar();
  const location = useLocation();
  const returnTo = returnPath(location.state);

  return (
    <Sidebar aria-label={studioT('Settings')} className="border-r border-border bg-background">
      <Sidebar.Header>
        <Sidebar.Trigger className="ml-0" />
        {state !== 'collapsed' && (
          <Txt variant="body-sm" className="ml-2 font-medium">
            {studioT('Settings')}
          </Txt>
        )}
      </Sidebar.Header>
      <Sidebar.Nav aria-label={studioT('Settings')}>
        <Sidebar.NavList className="mb-6">
          <Sidebar.NavLink
            link={{ name: studioT('Back to app'), url: returnTo }}
            render={
              <Link to={returnTo}>
                <IconArrowLeft />
                <Sidebar.NavLabel>{studioT('Back to app')}</Sidebar.NavLabel>
              </Link>
            }
          />
        </Sidebar.NavList>
        <Sidebar.NavList>
          <Sidebar.NavLink
            link={{ name: studioT('General'), url: '/settings' }}
            isActive
            render={
              <Link to="/settings" state={{ returnTo }}>
                <IconSettingsGear5 />
                <Sidebar.NavLabel>{studioT('General')}</Sidebar.NavLabel>
              </Link>
            }
          />
        </Sidebar.NavList>
      </Sidebar.Nav>
    </Sidebar>
  );
}
