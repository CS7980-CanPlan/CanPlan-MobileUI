/**
 * Pure mappers: backend user shapes -> shared UI domain types.
 * No network access.
 */

import type { UserProfile } from '../../../shared/types';
import type { BackendUserProfile } from '../types';

export function mapUserProfile(profile: BackendUserProfile): UserProfile {
  return {
    id: profile.userId,
    fullName: profile.displayName,
    email: profile.email,
    avatarUrl: undefined,
    lastActiveAt: profile.updatedAt ?? profile.createdAt ?? '',
    status:
      (profile.status ?? '').toUpperCase() === 'INACTIVE'
        ? 'inactive'
        : 'active',
  };
}
