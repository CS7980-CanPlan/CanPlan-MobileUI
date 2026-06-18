import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '../../../shared/query/queryKeys';
import { getMyTasks } from '../api/taskApi';

/** Fetches and caches the current user's tasks, ordered by due date. */
export function useTasks() {
  return useQuery({
    queryKey: queryKeys.tasks.mine,
    queryFn: getMyTasks,
  });
}
