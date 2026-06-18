/**
 * View-model returned by `useHomeData`, aggregating the data and request state
 * the home screen needs from several features.
 */

import type {
  MyDaySummary,
  ProgressEvent,
  Task,
  UserProfile,
} from '../../shared/types';

export interface HomeData {
  profile: UserProfile | undefined;
  tasks: Task[];
  /** Derived from `tasks`; undefined until tasks have loaded. */
  summary: MyDaySummary | undefined;
  recentActivity: ProgressEvent[];
  /** True while the core data (profile + tasks) is loading for the first time. */
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  /** Refetches all underlying queries. */
  refetch: () => void;
}
