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

import { configureAmplify } from '../config/amplifyConfig';
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
  configureAmplify();
  const { isSignUpComplete, nextStep } = await amplifySignUp({
    username,
    password,
    options: { userAttributes: { email } },
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
  configureAmplify();
  const { isSignUpComplete, nextStep } = await amplifyConfirmSignUp({
    username,
    confirmationCode,
  });
  return { isSignUpComplete, nextStep: nextStep.signUpStep };
}

/** Resends the sign-up confirmation code to the user. */
export async function resendSignUpCode({
  username,
}: ResendSignUpCodeInput): Promise<ResendSignUpCodeResult> {
  configureAmplify();
  const codeDeliveryDetails = await amplifyResendSignUpCode({ username });
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
  configureAmplify();
  const { isPasswordReset, nextStep } = await amplifyResetPassword({
    username,
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
  configureAmplify();
  await amplifyConfirmResetPassword({ username, confirmationCode, newPassword });
  return { isPasswordReset: true };
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
