import { useMutation, useQueryClient } from '@tanstack/react-query';

import { signIn } from '../api/authApi';

/**
 * Signs a user in. On success, all cached queries are invalidated so
 * user-scoped data (profile, tasks, activity) refetches under the new session.
 */
export function useSignIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: signIn,
    onSuccess: () => {
      void queryClient.invalidateQueries();
    },
  });
}
