import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '../../../shared/query/queryKeys';
import type { UserProfile } from '../../../shared/api/canplanTypes';
import { updateMyProfile } from '../api/userApi';

/**
 * Updates the signed-in user's profile (e.g. accessibility settings). Writes
 * the returned profile back into the `myProfile` cache so consumers
 * (HomeScreen, SettingsScreen) reflect the change without a refetch.
 */
export function useUpdateMyProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateMyProfile,
    onSuccess: (profile: UserProfile) => {
      queryClient.setQueryData(queryKeys.users.myProfile, profile);
    },
  });
}
