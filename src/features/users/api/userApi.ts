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
import { CREATE_USER_PROFILE, GET_USER_PROFILE } from '../graphql/userOperations';
import { mapUserProfile } from '../mappers/userMapper';
import type { BackendUserProfile, CreateUserProfileInput } from '../types';

interface GetUserProfileData {
  getUserProfile: BackendUserProfile | null;
}

interface CreateUserProfileData {
  createUserProfile: BackendUserProfile | null;
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

/**
 * Creates a user profile and returns the mapped domain `UserProfile`.
 *
 * Pass an explicit `input`, or call `createMyProfile` to default `userId` to
 * the signed-in Cognito user.
 */
export async function createUserProfile(
  input: CreateUserProfileInput,
): Promise<UserProfile> {
  const data = await graphqlRequest<
    CreateUserProfileData,
    { input: CreateUserProfileInput }
  >(CREATE_USER_PROFILE, { input });

  if (!data.createUserProfile) {
    throw new Error('createUserProfile returned no profile.');
  }

  return mapUserProfile(data.createUserProfile);
}

/**
 * Creates the profile for the currently signed-in user, filling `userId` from
 * the Cognito session so callers only supply the profile fields.
 */
export async function createMyProfile(
  input: Omit<CreateUserProfileInput, 'userId'>,
): Promise<UserProfile> {
  const userId = await getCurrentUserId();
  return createUserProfile({ ...input, userId });
}
