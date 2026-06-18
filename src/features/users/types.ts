/**
 * Raw backend (AppSync) shapes for the users feature. The UI never sees these;
 * `mappers/userMapper.ts` converts them into the shared `UserProfile` type.
 */

/**
 * Accessibility preferences. On the backend this is the `AWSJSON` scalar — a
 * free-form JSON object, NOT a typed GraphQL object — so it is selected as a
 * scalar and arrives already parsed into an object.
 */
export type BackendAccessibilitySettings = Record<string, unknown>;

/** Backend `UserRole` enum. */
export type BackendUserRole =
  | 'PRIMARY_USER'
  | 'SUPPORT_PERSON'
  | 'ORG_ADMIN'
  | string;

export interface BackendUserProfile {
  userId: string;
  role: BackendUserRole;
  displayName?: string | null;
  email?: string | null;
  organizationId?: string | null;
  accessibilitySettings?: BackendAccessibilitySettings | null;
  createdAt?: string | null;
}
