import { useMutation } from '@tanstack/react-query';

import { resendSignUpCode } from '../api/authApi';

/** Resends the sign-up confirmation code to the user's email. */
export function useResendSignUpCode() {
  return useMutation({
    mutationFn: resendSignUpCode,
  });
}
