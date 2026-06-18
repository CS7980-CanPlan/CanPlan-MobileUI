import { useMutation } from '@tanstack/react-query';

import { forgotPassword } from '../api/authApi';

/**
 * Starts a forgot-password flow. On success Cognito emails a reset code; the
 * caller then collects the code and a new password and calls
 * `useConfirmForgotPassword`.
 */
export function useForgotPassword() {
  return useMutation({
    mutationFn: forgotPassword,
  });
}
