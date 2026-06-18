import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { queryClient } from '../shared/query/queryClient';

type AppProvidersProps = {
  children: ReactNode;
};

/**
 * Wraps the app in cross-cutting providers. Currently the TanStack Query client;
 * future providers (auth, theme, etc.) compose here.
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
