import { useSidebar } from '@mastra/playground-ui/components/Sidebar';
import { useKeydown } from '@mastra/playground-ui/keyboard/use-keydown';
import { useLocation } from 'react-router';

/**
 * `[` toggles the main sidebar. Lives inside `Layout` because it needs the
 * `SidebarProvider` context, which `GlobalShortcuts` sits outside of.
 */
export const SidebarShortcuts = () => {
  const { toggleSidebar } = useSidebar();

  const { pathname } = useLocation();
  useKeydown(
    {
      '[': toggleSidebar,
      '{': () => {
        if (/^\/(?:agents|chat)\/[^/]+\/threads\//.test(pathname)) toggleSidebar();
      },
    },
    { repeat: false },
  );

  return null;
};
