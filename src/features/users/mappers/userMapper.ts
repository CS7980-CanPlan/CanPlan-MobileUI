/**
 * Pure mappers: backend user shapes -> shared UI domain types.
 * No network access.
 */

import type { UserProfile } from '../../../shared/types';
import type { BackendUserProfile } from '../types';

export function mapUserProfile(profile: BackendUserProfile): UserProfile {
  return {
    id: profile.userId,
    fullName: profile.displayName ?? '',
    email: profile.email ?? '',
    avatarUrl: undefined,
    // The backend UserProfile has no "last active" or status field; the
    // single-table schema only tracks createdAt. We surface createdAt as a
    // best-effort lastActiveAt and treat every fetched profile as active.
    lastActiveAt: profile.createdAt ?? '',
    status: 'active',
  };
}
