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
