import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '../../../shared/query/queryKeys';
import { getMyProfile } from '../api/userApi';

interface UseMyProfileOptions {
  /** When false the query won't fire (e.g. in guest mode, where there's no Cognito user). */
  enabled?: boolean;
}

/**
 * Fetches and caches the current user's profile. Returns `null` when the
 * signed-in user has not yet created their profile (drives the onboarding
 * gate in App.tsx).
 */
export function useMyProfile({ enabled = true }: UseMyProfileOptions = {}) {
  return useQuery({
    queryKey: queryKeys.users.myProfile,
    queryFn: getMyProfile,
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
