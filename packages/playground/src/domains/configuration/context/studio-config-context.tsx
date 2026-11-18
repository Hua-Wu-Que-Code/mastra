import { useEffect, useLayoutEffect, useState } from 'react';
import { z } from 'zod/v4';
import { useMastraInstanceStatus } from '../hooks/use-mastra-instance-status';

import type { StudioConfig } from '../types';
import { StudioConfigContext } from './studio-config-state';
import { useAccount } from '@/domains/account/account-context';

export interface StudioConfigProviderProps {
  children: React.ReactNode;
  endpoint?: string;
  defaultApiPrefix?: string;
}

export const MASTRA_STUDIO_CONFIG_LOCAL_STORAGE_KEY = 'mastra-studio-config';
const AUTH_HEADER_PARAM = 'auth_header';
const AUTH_HEADER_NAME = 'Authorization';

const readUrlAuthHeader = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};

  const authHeader = new URL(window.location.href).searchParams.get(AUTH_HEADER_PARAM);
  return authHeader ? { [AUTH_HEADER_NAME]: authHeader } : {};
};

const removeUrlAuthHeader = () => {
  if (typeof window === 'undefined') return;

  const url = new URL(window.location.href);
  if (!url.searchParams.has(AUTH_HEADER_PARAM)) return;

  url.searchParams.delete(AUTH_HEADER_PARAM);
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
};

const getPersistentConfig = (config: StudioConfig): StudioConfig => {
  // Custom header names can carry credentials too. Keep every header in memory only.
  return { baseUrl: config.baseUrl, apiPrefix: config.apiPrefix, headers: {} };
};

const storedConnectionSchema = z.object({
  baseUrl: z.string(),
  headers: z.record(z.string(), z.string()).default({}),
  apiPrefix: z.string().optional(),
});
function readStoredConnection() {
  try {
    const raw = localStorage.getItem(MASTRA_STUDIO_CONFIG_LOCAL_STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = storedConnectionSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return undefined;
    localStorage.setItem(MASTRA_STUDIO_CONFIG_LOCAL_STORAGE_KEY, JSON.stringify(getPersistentConfig(parsed.data)));
    return parsed.data;
  } catch {
    return undefined;
  }
}

const NativeStudioConfigProvider = ({
  children,
  endpoint = 'http://localhost:4111',
  defaultApiPrefix = '/api',
}: StudioConfigProviderProps) => {
  const [urlHeaders] = useState<Record<string, string>>(readUrlAuthHeader);
  const hasUrlHeaders = Object.keys(urlHeaders).length > 0;
  const {
    data: instanceStatus,
    isLoading: isStatusLoading,
    error,
  } = useMastraInstanceStatus(endpoint, defaultApiPrefix, urlHeaders);
  const [config, setConfig] = useState<StudioConfig & { isLoading: boolean }>({
    baseUrl: '',
    headers: urlHeaders,
    apiPrefix: undefined,
    isLoading: true,
  });

  useEffect(() => {
    removeUrlAuthHeader();
  }, []);

  useLayoutEffect(() => {
    // Handle error case - stop loading but don't configure
    if (error && !isStatusLoading) {
      return setConfig({ baseUrl: '', headers: urlHeaders, apiPrefix: undefined, isLoading: false });
    }

    // Don't run the effect during the fetch request
    if (!instanceStatus?.status) return;

    const parsedConfig = readStoredConnection();
    if (parsedConfig) {
      const normalizedConfig = {
        ...parsedConfig,
        headers: { ...parsedConfig.headers, ...urlHeaders },
        apiPrefix: parsedConfig.apiPrefix ?? defaultApiPrefix,
      };
      return setConfig({ ...normalizedConfig, isLoading: false });
    }

    if (instanceStatus.status === 'active') {
      const nextConfig = { baseUrl: endpoint, headers: urlHeaders, apiPrefix: defaultApiPrefix };
      if (hasUrlHeaders) {
        localStorage.setItem(MASTRA_STUDIO_CONFIG_LOCAL_STORAGE_KEY, JSON.stringify(getPersistentConfig(nextConfig)));
      }
      return setConfig({ ...nextConfig, isLoading: false });
    }

    return setConfig({ baseUrl: '', headers: urlHeaders, apiPrefix: undefined, isLoading: false });
  }, [instanceStatus, endpoint, defaultApiPrefix, isStatusLoading, error, urlHeaders, hasUrlHeaders]);

  const doSetConfig = (partialNewConfig: Partial<StudioConfig>) => {
    setConfig(prev => {
      const nextConfig = { ...prev, ...partialNewConfig };
      const persistentConfig = getPersistentConfig(nextConfig);
      localStorage.setItem(MASTRA_STUDIO_CONFIG_LOCAL_STORAGE_KEY, JSON.stringify(persistentConfig));
      return nextConfig;
    });
  };

  return (
    <StudioConfigContext.Provider value={{ ...config, setConfig: doSetConfig }}>
      {children}
    </StudioConfigContext.Provider>
  );
};

// Managed sessions are bound to the server that authenticated the account.
// A native Studio connection saved by an earlier user must not replace it.
export const StudioConfigProvider = (props: StudioConfigProviderProps) => {
  const account = useAccount();
  useEffect(() => {
    if (account) readStoredConnection();
  }, [account]);
  if (!account) return <NativeStudioConfigProvider {...props} />;
  return (
    <StudioConfigContext.Provider
      value={{
        baseUrl: props.endpoint ?? 'http://localhost:4111',
        apiPrefix: props.defaultApiPrefix ?? '/api',
        headers: {},
        isLoading: false,
        setConfig: () => {},
      }}
    >
      {props.children}
    </StudioConfigContext.Provider>
  );
};
