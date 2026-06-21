import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';

/**
 * Tracks whether the app is currently running in "guest" mode (the user
 * tapped "Skip" on the SignIn screen). Guest mode lets the user explore the
 * UI without a Cognito account; data is local/fake only.
 *
 * The real signed-in state comes from `useCurrentUser()` (Cognito session).
 * `showApp = !!cognitoUser || isGuest` is computed in the navigation root.
 */
interface SessionContextValue {
  isGuest: boolean;
  enterGuestMode: () => void;
  exitGuestMode: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [isGuest, setIsGuest] = useState(false);

  const enterGuestMode = useCallback(() => setIsGuest(true), []);
  const exitGuestMode = useCallback(() => setIsGuest(false), []);

  const value = useMemo(
    () => ({ isGuest, enterGuestMode, exitGuestMode }),
    [isGuest, enterGuestMode, exitGuestMode],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used inside <SessionProvider>');
  }
  return ctx;
}
