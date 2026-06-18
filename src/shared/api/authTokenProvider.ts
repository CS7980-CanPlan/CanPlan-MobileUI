/**
 * Auth token abstraction for the CanPlan mobile app.
 *
 * The GraphQL client must not depend on *how* the app authenticates. This
 * module is the seam: callers register a token source at runtime via
 * `setAuthTokenProvider`, and the network layer only ever asks this module for
 * the current Cognito ID token / user id.
 *
 * In this app the provider is supplied by the auth feature: on startup
 * `AppProviders` calls `registerAmplifyAuth()`, which configures AWS Amplify
 * and registers an Amplify/Cognito-backed provider (see
 * `src/features/auth/lib/amplifyAuthTokenProvider.ts`). The indirection keeps
 * Amplify out of the shared layer and makes the token source easy to swap (e.g.
 * a manual dev token in tests).
 *
 * If no provider has been registered — e.g. the Cognito env vars are missing —
 * `getIdToken()` / `getCurrentUserId()` throw a clear "authentication is not
 * configured" error rather than sending an unauthenticated request.
 */

/**
 * A pluggable source of Cognito credentials. Both methods may be synchronous or
 * return a promise. `getCurrentUserId` is optional but required by the feature
 * APIs to scope "my" queries to the signed-in user.
 */
export interface AuthTokenProvider {
  /** Returns the current Cognito ID token JWT, or null when not signed in. */
  getIdToken(): string | null | Promise<string | null>;
  /** Returns the current user's id, or null when not signed in. */
  getCurrentUserId?(): string | null | Promise<string | null>;
}

let provider: AuthTokenProvider | null = null;

/** Registers (or clears, with `null`) the active auth token provider. */
export function setAuthTokenProvider(next: AuthTokenProvider | null): void {
  provider = next;
}

/** Returns the currently registered provider, or null if none is set. */
export function getAuthTokenProvider(): AuthTokenProvider | null {
  return provider;
}

const NOT_CONFIGURED =
  'Authentication is not configured yet. Call setAuthTokenProvider() with a ' +
  'provider that returns a Cognito ID token before making API calls.';

/**
 * Resolves the current Cognito ID token. Throws a descriptive error if no
 * provider is registered or the provider has no token (user not signed in).
 */
export async function getIdToken(): Promise<string> {
  if (!provider) {
    throw new Error(NOT_CONFIGURED);
  }

  const token = await provider.getIdToken();
  if (!token) {
    throw new Error(
      'No Cognito ID token is available. The user is not signed in, or the ' +
        'session has expired.',
    );
  }

  return token;
}

/**
 * Resolves the current user's id, used to scope "my" queries. Throws if the
 * provider does not expose a user id (auth not configured).
 */
export async function getCurrentUserId(): Promise<string> {
  if (!provider || !provider.getCurrentUserId) {
    throw new Error(
      'Current user id is not available. Register an auth token provider with ' +
        'a getCurrentUserId() method before making user-scoped API calls.',
    );
  }

  const userId = await provider.getCurrentUserId();
  if (!userId) {
    throw new Error('No current user id is available. The user is not signed in.');
  }

  return userId;
}
