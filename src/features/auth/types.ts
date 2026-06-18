/** Credentials for a username/password (Cognito SRP) sign-in. */
export interface SignInCredentials {
  /** The Cognito username — typically the user's email. */
  username: string;
  password: string;
}

/** Result of a sign-in attempt. */
export interface SignInResult {
  /** True when the user is fully signed in (no further challenge required). */
  isSignedIn: boolean;
  /**
   * The next step name when a challenge is required (e.g.
   * `CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED`), otherwise `DONE`. Callers
   * that need to handle MFA/new-password flows branch on this.
   */
  nextStep: string;
}

/** The currently authenticated user, as the app sees it. */
export interface AuthUser {
  /** Cognito user id (the `sub`); used as the app-level user id. */
  userId: string;
  username: string;
}

/**
 * App-shaped view of where a confirmation code was delivered. Mirrors Amplify's
 * `CodeDeliveryDetails` but kept minimal and stable for UI ("we sent a code to
 * j***@example.com").
 */
export interface CodeDeliveryDetails {
  /** Masked destination the code was sent to (e.g. `j***@e***.com`). */
  destination?: string;
  /** How the code was delivered (e.g. `EMAIL`, `SMS`). */
  deliveryMedium?: string;
  /** The user attribute the code targets (e.g. `email`). */
  attributeName?: string;
}

/** Credentials for registering a new Cognito user. */
export interface SignUpCredentials {
  /** The Cognito username — typically the user's email. */
  username: string;
  password: string;
  /** Email address registered as a user attribute (used for verification). */
  email: string;
}

/** Result of a sign-up attempt. */
export interface SignUpResult {
  /** True when sign-up is fully complete (no confirmation required). */
  isSignUpComplete: boolean;
  /**
   * The next step name (e.g. `CONFIRM_SIGN_UP`, `DONE`). Callers branch on this
   * to decide whether to prompt for a confirmation code.
   */
  nextStep: string;
  /** Where the confirmation code was sent, when a confirmation step follows. */
  codeDeliveryDetails?: CodeDeliveryDetails;
}

/** Input for confirming a newly signed-up user with an emailed code. */
export interface ConfirmSignUpInput {
  username: string;
  confirmationCode: string;
}

/** Result of confirming a sign-up. */
export interface ConfirmSignUpResult {
  /** True when confirmation completed and the account is usable. */
  isSignUpComplete: boolean;
  /** The next step name (e.g. `DONE`). */
  nextStep: string;
}

/** Input for resending the sign-up confirmation code. */
export interface ResendSignUpCodeInput {
  username: string;
}

/** Result of resending the sign-up confirmation code. */
export interface ResendSignUpCodeResult {
  /** Where the new confirmation code was sent, if Amplify reported it. */
  codeDeliveryDetails?: CodeDeliveryDetails;
}

/** Input for starting a forgot-password flow. */
export interface ForgotPasswordInput {
  username: string;
}

/** Result of starting a forgot-password flow. */
export interface ForgotPasswordResult {
  /** True when the password is already reset (no confirmation needed). */
  isPasswordReset: boolean;
  /** The next step name (e.g. `CONFIRM_RESET_PASSWORD_WITH_CODE`, `DONE`). */
  nextStep: string;
  /** Where the reset code was sent, when a confirmation step follows. */
  codeDeliveryDetails?: CodeDeliveryDetails;
}

/** Input for completing a forgot-password flow with a code + new password. */
export interface ConfirmForgotPasswordInput {
  username: string;
  confirmationCode: string;
  newPassword: string;
}

/** Result of completing a forgot-password flow. */
export interface ConfirmForgotPasswordResult {
  /** True once the new password has been set. */
  isPasswordReset: boolean;
}
