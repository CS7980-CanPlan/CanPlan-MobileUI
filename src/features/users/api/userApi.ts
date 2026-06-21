/**
 * Users feature API facade.
 *
 * Calls GraphQL operations via the shared client and maps backend shapes onto
 * the shared `UserProfile` domain type. Screens consume this only through the
 * `useMyProfile` and `useCreateMyProfile` hooks.
 */

import { getCurrentUserId } from '../../../shared/api/authTokenProvider';
import { graphqlRequest } from '../../../shared/api/graphqlClient';
import type { UserProfile } from '../../../shared/types';
import { CREATE_USER_PROFILE, GET_USER_PROFILE } from '../graphql/userOperations';
import { mapUserProfile } from '../mappers/userMapper';
import type { BackendUserProfile, CreateMyUserProfileInput } from '../types';

interface GetUserProfileData {
  getUserProfile: BackendUserProfile | null;
}

interface CreateUserProfileData {
  createUserProfile: BackendUserProfile | null;
}

/**
 * Returns the profile of the currently signed-in user, or `null` if no profile
 * has been created yet (callers use null to trigger the onboarding flow —
 * see docs/API.md "Profile bootstrap").
 */
export async function getMyProfile(): Promise<UserProfile | null> {
  const userId = await getCurrentUserId();
  const data = await graphqlRequest<GetUserProfileData, { userId: string }>(
    GET_USER_PROFILE,
    { userId },
  );
  if (!data.getUserProfile) {
    return null;
  }
  return mapUserProfile(data.getUserProfile);
}

/**
 * Creates the signed-in caller's own profile. `userId`, `email`, and `role`
 * are derived server-side from the Cognito session and **must not** be sent
 * from the client (see docs/API.md).
 */
export async function createMyProfile(
  input: CreateMyUserProfileInput,
): Promise<UserProfile> {
  const data = await graphqlRequest<
    CreateUserProfileData,
    { input: CreateMyUserProfileInput }
  >(CREATE_USER_PROFILE, { input });

  if (!data.createUserProfile) {
    throw new Error('createUserProfile returned no profile.');
  }
  return mapUserProfile(data.createUserProfile);
}
