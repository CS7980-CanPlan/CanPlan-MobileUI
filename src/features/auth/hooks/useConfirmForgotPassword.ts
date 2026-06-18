import { useMutation } from '@tanstack/react-query';

import { confirmForgotPassword } from '../api/authApi';

/**
 * Completes a forgot-password flow by setting a new password with the emailed
 * code. On success the caller typically navigates to sign-in.
 */
export function useConfirmForgotPassword() {
  return useMutation({
    mutationFn: confirmForgotPassword,
  });
}
