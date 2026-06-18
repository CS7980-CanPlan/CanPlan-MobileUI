/**
 * Public surface of the auth feature.
 *
 * Screens use the hooks; app setup calls `registerAmplifyAuth()` once at
 * startup to configure Amplify and wire the Cognito token provider into the
 * shared network layer.
 */

export { registerAmplifyAuth } from './lib/amplifyAuthTokenProvider';
export { isAmplifyConfigured } from './config/amplifyConfig';
export { useCurrentUser } from './hooks/useCurrentUser';
export { useSignIn } from './hooks/useSignIn';
export { useSignOut } from './hooks/useSignOut';
export type { AuthUser, SignInCredentials, SignInResult } from './types';
