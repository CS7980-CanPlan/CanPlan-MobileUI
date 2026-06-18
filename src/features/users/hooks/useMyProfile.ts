import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '../../../shared/query/queryKeys';
import { getMyProfile } from '../api/userApi';

/** Fetches and caches the current user's profile. */
export function useMyProfile() {
  return useQuery({
    queryKey: queryKeys.users.myProfile,
    queryFn: getMyProfile,
  });
}
