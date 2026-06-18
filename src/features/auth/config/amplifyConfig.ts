/**
 * Amplify configuration for Cognito authentication.
 *
 * Reads the User Pool id and app client id from `EXPO_PUBLIC_*` env vars (the
 * `UserPoolId` / `UserPoolClientId` CloudFormation outputs) and configures the
 * Amplify Auth category. No secrets are hardcoded.
 *
 * Amplify is configured at most once; `isAmplifyConfigured()` reports whether
 * the required env vars were present so callers can fall back gracefully.
 */

import { Amplify } from 'aws-amplify';

let configured = false;

/** Configures Amplify Auth from env. Idempotent; safe to call repeatedly. */
export function configureAmplify(): void {
  if (configured) {
    return;
  }

  const userPoolId = process.env.EXPO_PUBLIC_COGNITO_USER_POOL_ID;
  const userPoolClientId = process.env.EXPO_PUBLIC_COGNITO_USER_POOL_CLIENT_ID;

  if (!userPoolId || !userPoolClientId) {
    // Leave unconfigured; auth calls will surface a clear error and the app can
    // run against fake data / show a sign-in-unavailable state.
    return;
  }

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId,
      },
    },
  });

  configured = true;
}

/** Whether Amplify Auth has been successfully configured from env. */
export function isAmplifyConfigured(): boolean {
  return configured;
}
