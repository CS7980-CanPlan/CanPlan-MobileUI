/**
 * Public surface of the auth feature.
 *
 * Screens use the hooks; app setup calls `registerAmplifyAuth()` once at
 * startup to configure Amplify and wire the Cognito token provider into the
 * shared network layer.
 */

export { registerAmplifyAuth } from './lib/amplifyAuthTokenProvider';
export { isAmplifyConfigured } from './config/amplifyConfig';
export { useConfirmForgotPassword } from './hooks/useConfirmForgotPassword';
export { useConfirmSignUp } from './hooks/useConfirmSignUp';
export { useCurrentUser } from './hooks/useCurrentUser';
export { useForgotPassword } from './hooks/useForgotPassword';
export { useResendSignUpCode } from './hooks/useResendSignUpCode';
export { useSignIn } from './hooks/useSignIn';
export { useSignOut } from './hooks/useSignOut';
export { useSignUp } from './hooks/useSignUp';
export type {
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
} from './types';
