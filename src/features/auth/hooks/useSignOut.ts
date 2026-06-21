import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '../../../shared/query/queryKeys';
import { signOut } from '../api/authApi';

/**
 * Signs the current user out.
 *
 * On success:
 *  - Seeds the `auth.currentUser` query with `null` so `useCurrentUser`
 *    subscribers (RootStack, HomeScreen) re-render immediately.
 *  - Removes every *other* cached query so no previous user's data lingers.
 *
 * We intentionally do NOT call `queryClient.clear()`: clear destroys query
 * observers, after which a follow-up `setQueryData` creates a new query but
 * the destroyed observer never re-subscribes — RootStack ends up never
 * re-rendering with the new null value. Removing only non-auth queries keeps
 * the auth observer attached so its `setQueryData(null)` actually propagates.
 */
export function useSignOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: signOut,
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.auth.currentUser, null);
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== 'auth',
      });
    },
  });
}
