import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { UserProfile } from '../../../shared/types';
import { queryKeys } from '../../../shared/query/queryKeys';
import { createMyProfile, createUserProfile } from '../api/userApi';

/**
 * Creates the signed-in user's profile (`userId` is taken from the Cognito
 * session). On success the new profile primes the `myProfile` cache so screens
 * relying on `useMyProfile` see it immediately without a refetch.
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

/**
 * Creates a profile for an explicit `userId` (e.g. a supporter provisioning
 * another user). Does not touch the `myProfile` cache.
 */
export function useCreateUserProfile() {
  return useMutation({ mutationFn: createUserProfile });
}
