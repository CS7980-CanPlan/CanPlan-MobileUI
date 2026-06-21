import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { registerAmplifyAuth } from '../features/auth';
import { queryClient } from '../shared/query/queryClient';
import { SessionProvider } from './SessionContext';

// Configure Amplify and register the Cognito-backed auth token provider once,
// when this module is first loaded. No-op (with a clear later error) if the
// Cognito env vars are absent.
registerAmplifyAuth();

type AppProvidersProps = {
  children: ReactNode;
};

/**
 * Wraps the app in cross-cutting providers: TanStack Query for server state,
 * SessionProvider for guest-mode tracking.
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>{children}</SessionProvider>
    </QueryClientProvider>
  );
}
