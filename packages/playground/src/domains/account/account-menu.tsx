import { Avatar } from '@mastra/playground-ui/components/Avatar';
import { DropdownMenu } from '@mastra/playground-ui/components/DropdownMenu';
import { useSidebar } from '@mastra/playground-ui/components/Sidebar';
import { Txt } from '@mastra/playground-ui/components/Txt';
import { IconArrowBoxLeft } from '@mastra/playground-ui/icons/central/IconArrowBoxLeft';
import { IconSettingsGear5 } from '@mastra/playground-ui/icons/central/IconSettingsGear5';
import { IconUser } from '@mastra/playground-ui/icons/central/IconUser';
import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';
import { useMutation } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router';
import { useAccount, useAccountSignOut } from './account-context';

export function AccountMenu() {
  useLocale();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const location = useLocation();
  const account = useAccount();
  const signOut = useAccountSignOut();
  const logout = useMutation({
    mutationFn: async () => {
      await signOut?.();
    },
  });
  if (!account) return undefined;
  const displayName = account.user.name || account.user.email || account.user.id;
  const collapsed = state === 'collapsed' && !isMobile;

  return (
    <DropdownMenu>
      <DropdownMenu.Trigger
        variant="ghost"
        aria-label={displayName}
        className={`w-full rounded-lg ${collapsed ? 'h-control-md justify-center px-0' : 'h-auto min-h-control-lg justify-start gap-3 px-3 py-2'}`}
      >
        <Avatar size="sm">
          <Avatar.Fallback>
            <IconUser />
          </Avatar.Fallback>
        </Avatar>
        {!collapsed && (
          <Txt as="span" variant="body-sm" className="min-w-0 flex-1 truncate text-left font-medium">
            {displayName}
          </Txt>
        )}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content side="top" align="start" className="min-w-56">
        <DropdownMenu.LinkItem
          render={<Link to="/settings" state={{ returnTo: location.pathname + location.search + location.hash }} />}
          onClick={() => setOpenMobile(false)}
        >
          <IconSettingsGear5 />
          {studioT('Settings')}
        </DropdownMenu.LinkItem>
        <DropdownMenu.Item onClick={() => logout.mutate()} closeOnClick={false} disabled={logout.isPending || !signOut}>
          <IconArrowBoxLeft />
          {logout.isPending ? studioT('Signing out…') : studioT('Sign out')}
        </DropdownMenu.Item>
        {logout.error && (
          <Txt variant="caption" role="alert" className="max-w-64 px-2 py-1 break-words">
            {logout.error.message}
          </Txt>
        )}
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}
