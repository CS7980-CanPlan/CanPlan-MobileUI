import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '../../../shared/query/queryKeys';
import { getMyRecentActivity } from '../api/progressApi';

/** Fetches and caches the current user's most recent progress events. */
export function useRecentActivity(limit?: number) {
  return useQuery({
    queryKey: queryKeys.progress.recentActivity(limit),
    queryFn: () => getMyRecentActivity(limit),
  });
}
