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
  confirmResetPassword as amplifyConfirmResetPassword,
  confirmSignUp as amplifyConfirmSignUp,
  resendSignUpCode as amplifyResendSignUpCode,
  resetPassword as amplifyResetPassword,
  signIn as amplifySignIn,
  signOut as amplifySignOut,
  signUp as amplifySignUp,
  fetchAuthSession,
  getCurrentUser,
} from 'aws-amplify/auth';

import { configureAmplify, isAmplifyConfigured } from '../config/amplifyConfig';
import type {
  AuthUser,
  CodeDeliveryDetails,
  ConfirmForgotPasswordInput,
  ConfirmForgotPasswordResult,
  ConfirmSignUpInput,
  ConfirmSignUpResult,
  ForgotPasswordInput,
  ForgotPasswordResult,
  ResendSignUpCodeInput,
  ResendSignUpCodeResult,
  SignInCredentials,
  SignInResult,
  SignUpCredentials,
  SignUpResult,
} from '../types';

/**
 * Throws a clean error before calling Amplify when env vars are missing.
 * Without this, Amplify itself logs a "Amplify has not been configured" warn
 * before throwing — noisy in dev and triggers the LogBox overlay. The error
 * we throw matches the `not configured` substring used by `errorMessages.ts`.
 */
function ensureConfigured(): void {
  configureAmplify();
  if (!isAmplifyConfigured()) {
    const err = new Error('Authentication is not configured.');
    err.name = 'NotConfiguredError';
    throw err;
  }
}

/**
 * Trim + lowercase the email before sending to Cognito.
 *
 * Cognito User Pools are case-sensitive by default (per RFC 5321), but in
 * practice every real-world email provider treats the local part as
 * case-insensitive. Without this, `John@x.com` and `john@x.com` become two
 * different accounts and the user can't sign in if they capitalize differently
 * than at sign-up. Done here in the API layer (not the screens) so every flow
 * — signIn, signUp, confirmSignUp, resend, forgot password — stays consistent.
 */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Signs in with username/password and returns the resulting sign-in state.
 *
 * Uses USER_PASSWORD_AUTH (not the default USER_SRP_AUTH). SRP needs native
 * crypto from `@aws-amplify/react-native`, which isn't linked into Expo Go's
 * pre-built binary — so SRP throws "package not linked" at runtime there.
 * USER_PASSWORD_AUTH is plain HTTPS POST and works in Expo Go.
 *
 * Requires the User Pool App Client to have `ALLOW_USER_PASSWORD_AUTH` enabled.
 * Once we move off Expo Go (EAS Dev Build), switching back to SRP is one prop.
 */
export async function signIn({
  username,
  password,
}: SignInCredentials): Promise<SignInResult> {
  ensureConfigured();
  const { isSignedIn, nextStep } = await amplifySignIn({
    username: normalizeEmail(username),
    password,
    options: { authFlowType: 'USER_PASSWORD_AUTH' },
  });
  return { isSignedIn, nextStep: nextStep.signInStep };
}

/** Signs the current user out. */
export async function signOut(): Promise<void> {
  ensureConfigured();
  await amplifySignOut();
}

/**
 * Maps Amplify's `CodeDeliveryDetails` to the app-shaped equivalent. Returns
 * `undefined` when Amplify did not report any delivery details.
 */
function toCodeDeliveryDetails(
  details:
    | {
        destination?: string;
        deliveryMedium?: string;
        attributeName?: string;
      }
    | undefined,
): CodeDeliveryDetails | undefined {
  if (!details) return undefined;
  return {
    destination: details.destination,
    deliveryMedium: details.deliveryMedium,
    attributeName: details.attributeName,
  };
}

/**
 * Registers a new Cognito user. `username` is the login identifier (typically
 * the email); `email` is also stored as a user attribute so the confirmation
 * code can be delivered there. Most pools require confirmation, in which case
 * `isSignUpComplete` is false and `nextStep` is `CONFIRM_SIGN_UP`.
 */
export async function signUp({
  username,
  password,
  email,
}: SignUpCredentials): Promise<SignUpResult> {
  ensureConfigured();
  const { isSignUpComplete, nextStep } = await amplifySignUp({
    username: normalizeEmail(username),
    password,
    options: { userAttributes: { email: normalizeEmail(email) } },
  });
  return {
    isSignUpComplete,
    nextStep: nextStep.signUpStep,
    codeDeliveryDetails:
      nextStep.signUpStep === 'CONFIRM_SIGN_UP'
        ? toCodeDeliveryDetails(nextStep.codeDeliveryDetails)
        : undefined,
  };
}

/** Confirms a newly signed-up user with the code delivered to their email. */
export async function confirmSignUp({
  username,
  confirmationCode,
}: ConfirmSignUpInput): Promise<ConfirmSignUpResult> {
  ensureConfigured();
  const { isSignUpComplete, nextStep } = await amplifyConfirmSignUp({
    username: normalizeEmail(username),
    confirmationCode,
  });
  return { isSignUpComplete, nextStep: nextStep.signUpStep };
}

/** Resends the sign-up confirmation code to the user. */
export async function resendSignUpCode({
  username,
}: ResendSignUpCodeInput): Promise<ResendSignUpCodeResult> {
  ensureConfigured();
  const codeDeliveryDetails = await amplifyResendSignUpCode({
    username: normalizeEmail(username),
  });
  return { codeDeliveryDetails: toCodeDeliveryDetails(codeDeliveryDetails) };
}

/**
 * Starts a forgot-password flow. On success Cognito sends a reset code (usually
 * by email) and `nextStep` is `CONFIRM_RESET_PASSWORD_WITH_CODE`; complete the
 * flow with `confirmForgotPassword`.
 */
export async function forgotPassword({
  username,
}: ForgotPasswordInput): Promise<ForgotPasswordResult> {
  ensureConfigured();
  const { isPasswordReset, nextStep } = await amplifyResetPassword({
    username: normalizeEmail(username),
  });
  return {
    isPasswordReset,
    nextStep: nextStep.resetPasswordStep,
    codeDeliveryDetails:
      nextStep.resetPasswordStep === 'CONFIRM_RESET_PASSWORD_WITH_CODE'
        ? toCodeDeliveryDetails(nextStep.codeDeliveryDetails)
        : undefined,
  };
}

/** Completes a forgot-password flow by setting a new password with the code. */
export async function confirmForgotPassword({
  username,
  confirmationCode,
  newPassword,
}: ConfirmForgotPasswordInput): Promise<ConfirmForgotPasswordResult> {
  ensureConfigured();
  await amplifyConfirmResetPassword({
    username: normalizeEmail(username),
    confirmationCode,
    newPassword,
  });
  return { isPasswordReset: true };
}

/**
 * Returns the current Cognito ID token (JWT), or null if not signed in. This is
 * the value sent as the AppSync `Authorization` header.
 */
export async function getIdToken(): Promise<string | null> {
  configureAmplify();
  if (!isAmplifyConfigured()) return null;
  const session = await fetchAuthSession();
  return session.tokens?.idToken?.toString() ?? null;
}

/** Returns the currently signed-in user, or null if there is no session. */
export async function getCurrentAuthUser(): Promise<AuthUser | null> {
  configureAmplify();
  if (!isAmplifyConfigured()) return null;
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
