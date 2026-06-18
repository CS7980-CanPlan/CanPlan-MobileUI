import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '../../../shared/query/queryKeys';
import { getCurrentAuthUser } from '../api/authApi';

/**
 * Returns the currently signed-in user (or `null`). `data === null` means
 * signed-out; `isLoading` covers the initial session check.
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.auth.currentUser,
    queryFn: getCurrentAuthUser,
    staleTime: Infinity,
  });
}
