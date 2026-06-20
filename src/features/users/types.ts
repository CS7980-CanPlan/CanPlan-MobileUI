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

/**
 * Input for the `createUserProfile` mutation (`CreateUserProfileInput`).
 * `userId` and `role` are required; everything else is optional. Optional
 * fields are omitted from the request rather than sent as `null`.
 *
 * `accessibilitySettings` is the backend `AWSJSON` scalar — pass a plain JSON
 * object (the client serializes the whole `variables` payload to JSON).
 */
export interface CreateUserProfileInput {
  userId: string;
  role: BackendUserRole;
  displayName?: string;
  email?: string;
  organizationId?: string;
  accessibilitySettings?: BackendAccessibilitySettings;
}
