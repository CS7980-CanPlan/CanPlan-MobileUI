/**
 * Auth feature API facade (Cognito via AWS Amplify).
 *
 * This mirrors the other feature API facades: it owns all calls to the auth
 * "client" (Amplify's `aws-amplify/auth`) and exposes small, app-shaped
 * functions. Screens use these only through the auth hooks.
 *
 * The shared GraphQL client never imports this directly — instead, an
 * Amplify-backed `AuthTokenProvider` (see `lib/amplifyAuthTokenProvider.ts`) is
 * registered with `setAuthTokenProvider`, so the network layer stays decoupled
 * from Amplify.
 */

import {
  fetchAuthSession,
  getCurrentUser,
  signIn as amplifySignIn,
  signOut as amplifySignOut,
} from 'aws-amplify/auth';

import { configureAmplify } from '../config/amplifyConfig';
import type { AuthUser, SignInCredentials, SignInResult } from '../types';

/** Signs in with username/password and returns the resulting sign-in state. */
export async function signIn({
  username,
  password,
}: SignInCredentials): Promise<SignInResult> {
  configureAmplify();
  const { isSignedIn, nextStep } = await amplifySignIn({ username, password });
  return { isSignedIn, nextStep: nextStep.signInStep };
}

/** Signs the current user out. */
export async function signOut(): Promise<void> {
  configureAmplify();
  await amplifySignOut();
}

/**
 * Returns the current Cognito ID token (JWT), or null if not signed in. This is
 * the value sent as the AppSync `Authorization` header.
 */
export async function getIdToken(): Promise<string | null> {
  configureAmplify();
  const session = await fetchAuthSession();
  return session.tokens?.idToken?.toString() ?? null;
}

/** Returns the currently signed-in user, or null if there is no session. */
export async function getCurrentAuthUser(): Promise<AuthUser | null> {
  configureAmplify();
  try {
    const user = await getCurrentUser();
    return { userId: user.userId, username: user.username };
  } catch {
    // getCurrentUser throws when there is no authenticated user.
    return null;
  }
}

/** Returns the current user's id (Cognito `sub`), or null if not signed in. */
export async function getCurrentUserId(): Promise<string | null> {
  const user = await getCurrentAuthUser();
  return user?.userId ?? null;
}
