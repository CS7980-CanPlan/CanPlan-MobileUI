/**
 * Raw backend (AppSync) shapes for the users feature. The UI never sees these;
 * `mappers/userMapper.ts` converts them into the shared `UserProfile` type.
 */

/** Accessibility preferences attached to a user profile. */
export interface BackendAccessibilitySettings {
  fontScale?: number | null;
  highContrast?: boolean | null;
  reducedMotion?: boolean | null;
  textToSpeech?: boolean | null;
}

export type BackendUserRole = 'PRIMARY_USER' | 'SUPPORTER' | 'ADMIN' | string;

export interface BackendUserProfile {
  userId: string;
  role: BackendUserRole;
  displayName: string;
  email: string;
  organizationId?: string | null;
  accessibilitySettings?: BackendAccessibilitySettings | null;
  status?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}
