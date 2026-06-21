import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '../../../shared/query/queryKeys';
import {
  createSupportLink,
  getUserProfile,
  listAllUsers,
  listPrimaryUsersBySupporter,
  listUsersByOrganization,
} from '../api/userApi';
import type { CreateSupportLinkInput } from '../../../shared/api/canplanTypes';

/** Fetches any profile by id. Use `useMyProfile` for the signed-in caller. */
export function useUserProfile(userId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.users.profile(userId),
    queryFn: () => getUserProfile(userId),
    enabled: enabled && Boolean(userId),
  });
}

/** Paginated organization roster. Roster projections can have nullable fields. */
export function useUsersByOrganization(organizationId: string, limit = 50) {
  return useInfiniteQuery({
    queryKey: queryKeys.users.organization(organizationId, limit),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      listUsersByOrganization(organizationId, { limit, nextToken: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextToken ?? undefined,
    enabled: Boolean(organizationId),
  });
}

/** Paginated list of primary-user links managed by a supporter. */
export function usePrimaryUsersBySupporter(supporterId: string, limit = 50) {
  return useInfiniteQuery({
    queryKey: queryKeys.users.primaryBySupporter(supporterId, limit),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      listPrimaryUsersBySupporter(supporterId, { limit, nextToken: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextToken ?? undefined,
    enabled: Boolean(supporterId),
  });
}

/** Creates or replaces a supporter → primary-user link. */
export function useCreateSupportLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateSupportLinkInput) => createSupportLink(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

/** SystemAdmin-only paginated user listing. */
export function useAllUsers(limit = 50, enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.users.all(limit),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => listAllUsers({ limit, nextToken: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextToken ?? undefined,
    enabled,
  });
}
