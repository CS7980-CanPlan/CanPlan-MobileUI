import { QueryClient } from '@tanstack/react-query';

/**
 * App-wide TanStack Query client.
 *
 * - `staleTime` of 60s keeps recently-fetched data fresh, avoiding redundant
 *   refetches while the user navigates.
 * - `retry: 1` retries a failed query once before surfacing the error.
 * - `refetchOnWindowFocus: false` is appropriate for React Native.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
