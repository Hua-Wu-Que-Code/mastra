import { useAgents } from '@mastra/react/hooks/agents';
import { Navigate } from 'react-router';
import { useAccount } from '@/domains/account/account-context';
import { usePermissions } from '@/domains/auth/hooks/use-permissions';
import { getFirstAccessibleRoute } from '@/domains/auth/route-permissions';

/**
 * Decides where to land when the user hits `/`.
 *
 * Users are redirected to the first accessible route based on their permissions.
 * Falls back to /settings (a public page) if no other routes are accessible.
 *
 * Waits for auth to load before redirecting so we don't flash the
 * wrong route mid-hydration.
 */
export const StudioIndexRedirect = () => {
  const account = useAccount();
  const {
    hasPermission,
    hasAnyPermission,
    rbacEnabled,
    isLoading: isPermissionsLoading,
    isAuthenticated,
  } = usePermissions();
  const openChat = !!account && hasPermission('agents:read') && hasPermission('agents:execute');
  const { data: agents, isPending: isAgentsPending } = useAgents({
    queryOptions: { enabled: openChat && !isPermissionsLoading },
  });

  if (isPermissionsLoading) return null;

  if (openChat) {
    if (isAgentsPending) return null;
    const agentId = Object.keys(agents ?? {})[0];
    if (agentId) return <Navigate to={`/chat/${encodeURIComponent(agentId)}/threads/new`} replace />;
  }

  // If RBAC is disabled or not authenticated, go to /agents (default behavior)
  if (!rbacEnabled || !isAuthenticated) {
    return <Navigate to="/agents" replace />;
  }

  // Find the first route the user has permission to access
  const firstAccessibleRoute = getFirstAccessibleRoute(hasPermission, hasAnyPermission);

  return <Navigate to={firstAccessibleRoute} replace />;
};
