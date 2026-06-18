import { useMutation } from '@tanstack/react-query';

import { signUp } from '../api/authApi';

/**
 * Registers a new user. Most pools return `isSignUpComplete: false` with a
 * `CONFIRM_SIGN_UP` next step; callers then collect the emailed code and call
 * `useConfirmSignUp`. No cache invalidation — the user is not signed in yet.
 */
export function useSignUp() {
  return useMutation({
    mutationFn: signUp,
  });
}
