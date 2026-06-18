import { useMutation } from '@tanstack/react-query';

import { confirmSignUp } from '../api/authApi';

/**
 * Confirms a newly registered user with the code emailed to them. On success
 * the account is usable; the caller typically navigates to sign-in. Confirming
 * does not establish a session, so there is nothing to invalidate.
 */
export function useConfirmSignUp() {
  return useMutation({
    mutationFn: confirmSignUp,
  });
}
