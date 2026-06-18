import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { registerAmplifyAuth } from '../features/auth';
import { queryClient } from '../shared/query/queryClient';

// Configure Amplify and register the Cognito-backed auth token provider once,
// when this module is first loaded. No-op (with a clear later error) if the
// Cognito env vars are absent.
registerAmplifyAuth();

type AppProvidersProps = {
  children: ReactNode;
};

/**
 * Wraps the app in cross-cutting providers. Currently the TanStack Query client;
 * future providers (theme, navigation context, etc.) compose here.
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
