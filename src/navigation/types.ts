/**
 * Navigation param lists.
 *
 * Three stacks live in the app — Auth, Onboarding, Main — swapped at the
 * root (App.tsx) based on session state, not nested.
 */

export type AuthStackParamList = {
  SignIn: undefined;
  /**
   * Carries the password through to VerifyEmail so we can auto-sign-in after
   * the user confirms their code (no second password prompt). Lives in
   * navigation params only — not persisted.
   */
  CreateAccount: undefined;
  VerifyEmail: { email: string; password: string };

  /**
   * Forgot-password flow (2 steps), matching Cognito's two backend calls:
   *   Step 1 — ForgotPassword: enter email, server sends code (resetPassword).
   *   Step 2 — ForgotPasswordReset: enter code + new password, server validates
   *            and sets both atomically (confirmResetPassword).
   */
  ForgotPassword: undefined;
  ForgotPasswordReset: { email: string };
};

export type OnboardingStackParamList = {
  Name: undefined;
};

export type MainStackParamList = {
  Home: undefined;
  AllTasks: undefined;
  CreateTask: { taskId?: string } | undefined;
};
