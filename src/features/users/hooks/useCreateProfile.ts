import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '../../../shared/query/queryKeys';
import type { UserProfile } from '../../../shared/api/canplanTypes';
import { createMyProfile } from '../api/userApi';

/**
 * Creates the signed-in user's profile. Seeds the new profile into the
 * `myProfile` cache so `useMyProfile` consumers (HomeScreen greeting, the
 * onboarding gate in App.tsx) see it immediately without a refetch.
 */
export function useCreateMyProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createMyProfile,
    onSuccess: (profile: UserProfile) => {
      queryClient.setQueryData(queryKeys.users.myProfile, profile);
    },
  });
}
