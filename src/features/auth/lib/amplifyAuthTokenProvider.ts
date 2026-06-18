/**
 * Bridges the auth feature to the shared network layer.
 *
 * The shared GraphQL client asks `authTokenProvider` for a Cognito ID token and
 * the current user id. Here we implement that provider on top of the Amplify
 * auth API and register it. Calling `registerAmplifyAuth()` once at app startup
 * is all the wiring the rest of the app needs.
 */

import {
  setAuthTokenProvider,
  type AuthTokenProvider,
} from '../../../shared/api/authTokenProvider';
import { getCurrentUserId, getIdToken } from '../api/authApi';
import { configureAmplify, isAmplifyConfigured } from '../config/amplifyConfig';

/** An `AuthTokenProvider` backed by Amplify / Cognito. */
export const amplifyAuthTokenProvider: AuthTokenProvider = {
  getIdToken,
  getCurrentUserId,
};

/**
 * Configures Amplify and, when the Cognito env vars are present, registers the
 * Amplify-backed auth token provider. If they are absent, no provider is set so
 * the shared layer surfaces its clear "authentication is not configured" error
 * rather than a lower-level Amplify error.
 */
export function registerAmplifyAuth(): void {
  configureAmplify();
  if (isAmplifyConfigured()) {
    setAuthTokenProvider(amplifyAuthTokenProvider);
  }
}
