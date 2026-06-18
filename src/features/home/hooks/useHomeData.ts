import { useMemo } from 'react';

import { useRecentActivity } from '../../progress/hooks/useRecentActivity';
import { useTasks } from '../../tasks/hooks/useTasks';
import { useMyProfile } from '../../users/hooks/useMyProfile';
import { computeDaySummary } from '../api/homeApi';
import type { HomeData } from '../types';

/**
 * Aggregates everything the home screen needs from the users, tasks, and
 * progress features into a single view-model.
 *
 * The day summary is computed from the cached `useTasks` data rather than via
 * `getMyDaySummary()`, so the task list is fetched only once. Each underlying
 * query is shared/deduplicated by TanStack Query under its own key.
 */
export function useHomeData(): HomeData {
  const profileQuery = useMyProfile();
  const tasksQuery = useTasks();
  const activityQuery = useRecentActivity(5);

  const summary = useMemo(
    () => (tasksQuery.data ? computeDaySummary(tasksQuery.data) : undefined),
    [tasksQuery.data],
  );

  return {
    profile: profileQuery.data,
    tasks: tasksQuery.data ?? [],
    summary,
    recentActivity: activityQuery.data ?? [],
    // Core data the screen blocks on; recent activity loads independently.
    isLoading: profileQuery.isLoading || tasksQuery.isLoading,
    isError: profileQuery.isError || tasksQuery.isError,
    error: profileQuery.error ?? tasksQuery.error ?? null,
    refetch: () => {
      void profileQuery.refetch();
      void tasksQuery.refetch();
      void activityQuery.refetch();
    },
  };
}
