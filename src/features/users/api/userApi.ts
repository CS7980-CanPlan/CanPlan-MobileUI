/**
 * Users feature API facade.
 *
 * Calls GraphQL operations via the shared client and maps backend shapes onto
 * the shared `UserProfile` domain type. Screens consume this only through the
 * `useMyProfile` hook.
 */

import { getCurrentUserId } from '../../../shared/api/authTokenProvider';
import { graphqlRequest } from '../../../shared/api/graphqlClient';
import type { UserProfile } from '../../../shared/types';
import { GET_USER_PROFILE } from '../graphql/userOperations';
import { mapUserProfile } from '../mappers/userMapper';
import type { BackendUserProfile } from '../types';

interface GetUserProfileData {
  getUserProfile: BackendUserProfile | null;
}

/** Returns the profile of the currently signed-in primary user. */
export async function getMyProfile(): Promise<UserProfile> {
  const userId = await getCurrentUserId();
  const data = await graphqlRequest<GetUserProfileData, { userId: string }>(
    GET_USER_PROFILE,
    { userId },
  );

  if (!data.getUserProfile) {
    throw new Error(`No user profile found for user "${userId}".`);
  }

  return mapUserProfile(data.getUserProfile);
}
