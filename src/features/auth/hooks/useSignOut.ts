import { useMutation, useQueryClient } from '@tanstack/react-query';

import { signOut } from '../api/authApi';

/**
 * Signs the current user out. On success, the entire query cache is cleared so
 * no previous user's data lingers.
 */
export function useSignOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: signOut,
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
