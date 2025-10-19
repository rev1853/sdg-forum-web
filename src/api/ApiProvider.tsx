import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import {
  DEFAULT_API_BASE_URL,
  createApiClient,
  type ApiClient,
  type ApiClientOptions,
} from './client';
import {
  createAuthService,
  createCategoriesService,
  createThreadsService,
  createUsersService,
  type AuthService,
  type CategoriesService,
  type ThreadsService,
  type UsersService,
} from './services';

export interface ApiProviderProps {
  children: ReactNode;
  baseUrl?: string;
  initialToken?: string | null;
  onUnauthorized?: ApiClientOptions['onUnauthorized'];
}

export interface ApiContextValue {
  client: ApiClient;
  baseUrl: string;
  token: string | null;
  setToken: (token: string | null) => void;
  auth: AuthService;
  threads: ThreadsService;
  categories: CategoriesService;
  users: UsersService;
}

const ApiContext = createContext<ApiContextValue | undefined>(undefined);

export const ApiProvider = ({
  children,
  baseUrl,
  initialToken = null,
  onUnauthorized,
}: ApiProviderProps) => {
  const [token, setToken] = useState<string | null>(initialToken);
  const resolvedBaseUrl = baseUrl ?? DEFAULT_API_BASE_URL;

  const client = useMemo(
    () =>
      createApiClient({
        baseUrl: resolvedBaseUrl,
        getAccessToken: () => token,
        onUnauthorized: () => {
          setToken(null);
          onUnauthorized?.();
        },
      }),
    [resolvedBaseUrl, token, onUnauthorized, setToken],
  );

  const services = useMemo(
    () => ({
      auth: createAuthService(client),
      threads: createThreadsService(client),
      categories: createCategoriesService(client),
      users: createUsersService(client),
    }),
    [client],
  );

  const value = useMemo<ApiContextValue>(
    () => ({
      client,
      baseUrl: resolvedBaseUrl,
      token,
      setToken,
      ...services,
    }),
    [client, resolvedBaseUrl, services, setToken, token],
  );

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
};

export const useApi = (): ApiContextValue => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
};
