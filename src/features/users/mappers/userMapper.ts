/**
 * Pure mappers: backend user shapes -> shared UI domain types.
 * No network access.
 */

import type { UserProfile, UserRole } from '../../../shared/types';
import type { BackendUserProfile } from '../types';

export function mapUserProfile(profile: BackendUserProfile): UserProfile {
  return {
    id: profile.userId,
    displayName: profile.displayName ?? '',
    email: profile.email ?? undefined,
    role: profile.role as UserRole,
    organizationId: profile.organizationId ?? undefined,
    accessibilitySettings: profile.accessibilitySettings ?? undefined,
    createdAt: profile.createdAt ?? undefined,
  };
}
