/**
 * User-facing message mapping for Cognito errors thrown by Amplify Auth.
 *
 * Amplify error objects carry `name` (the Cognito exception class) and
 * `message` (Cognito's human-readable text, sometimes useful for password
 * policy details). Map both into stable copy here so screens stay terse.
 */

export function getErrorName(err: unknown): string {
  return (err as { name?: string })?.name ?? '';
}

export function getErrorMessage(err: unknown): string {
  return (err as { message?: string })?.message ?? '';
}

const COMMON: Record<string, string> = {
  NetworkError: 'Network problem. Check your connection and try again.',
  TooManyRequestsException: 'Too many attempts. Please try again in a few minutes.',
  LimitExceededException: 'Too many attempts. Please try again in a few minutes.',
};

export function messageForSignInError(err: unknown): string {
  const name = getErrorName(err);
  const message = getErrorMessage(err);
  if (COMMON[name]) return COMMON[name];

  switch (name) {
    case 'UserNotFoundException':
      return 'No account found for this email.';
    case 'NotAuthorizedException':
      return /disabled/i.test(message)
        ? 'This account has been disabled. Please contact support.'
        : 'Incorrect email or password.';
    case 'UserNotConfirmedException':
      return 'Please verify your email before signing in.';
    case 'PasswordResetRequiredException':
      return 'You need to reset your password before signing in.';
    case 'InvalidParameterException':
      return 'Please check your email and password.';
    default:
      if (/not configured/i.test(message)) {
        return 'Sign-in is not configured yet. Use "Skip" to try the app.';
      }
      return message || 'Sign in failed. Please try again.';
  }
}

export function messageForSignUpError(err: unknown): string {
  const name = getErrorName(err);
  const message = getErrorMessage(err);
  if (COMMON[name]) return COMMON[name];

  switch (name) {
    case 'UsernameExistsException':
      return 'An account with this email already exists.';
    case 'InvalidPasswordException':
      // Cognito's policy message is informative, e.g.
      // "Password did not conform with policy: Password must have lowercase characters"
      return message || 'Password does not meet the requirements.';
    case 'InvalidParameterException':
      return /password/i.test(message)
        ? message
        : 'Please check your email and password.';
    default:
      if (/not configured/i.test(message)) {
        return 'Sign-up is not configured yet.';
      }
      return message || 'Sign up failed. Please try again.';
  }
}

export function messageForForgotPasswordError(err: unknown): string {
  const name = getErrorName(err);
  const message = getErrorMessage(err);
  if (COMMON[name]) return COMMON[name];

  switch (name) {
    case 'UserNotFoundException':
      return 'No account found for this email. Try creating an account first.';
    case 'InvalidParameterException':
      // Cognito throws this when the user is unconfirmed (no verified email).
      if (/verified|verify/i.test(message)) {
        return 'This email isn\'t verified yet. Please complete sign-up first.';
      }
      return 'Please check your email address.';
    case 'NotAuthorizedException':
      return 'This account is unavailable. Please contact support.';
    default:
      if (/not configured/i.test(message)) {
        return 'Password reset is not configured yet.';
      }
      return message || 'Could not send the reset email. Please try again.';
  }
}

export function messageForResetPasswordError(err: unknown): string {
  const name = getErrorName(err);
  const message = getErrorMessage(err);
  if (COMMON[name]) return COMMON[name];

  switch (name) {
    case 'CodeMismatchException':
      return 'Incorrect code. Please go back and try again.';
    case 'ExpiredCodeException':
      return 'This code has expired. Please go back and request a new one.';
    case 'InvalidPasswordException':
      // Cognito's policy message is informative.
      return message || 'Password does not meet the requirements.';
    case 'TooManyFailedAttemptsException':
      return 'Too many failed attempts. Please request a new code.';
    case 'UserNotFoundException':
      return 'Account not found. Please go back and try again.';
    default:
      return message || 'Could not reset your password. Please try again.';
  }
}

export function messageForConfirmError(err: unknown): string {
  const name = getErrorName(err);
  const message = getErrorMessage(err);
  if (COMMON[name]) return COMMON[name];

  switch (name) {
    case 'CodeMismatchException':
      return 'Incorrect code. Please check and try again.';
    case 'ExpiredCodeException':
      return 'This code has expired. Tap "Resend email" to get a new one.';
    case 'NotAuthorizedException':
      return /confirmed/i.test(message)
        ? 'This account has already been verified. Please sign in.'
        : 'Verification failed. Please try again.';
    case 'UserNotFoundException':
      return 'Account not found. Please go back and try again.';
    default:
      return message || 'Verification failed. Please try again.';
  }
}
