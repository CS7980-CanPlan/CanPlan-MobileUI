import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '../../../shared/query/queryKeys';
import { getTaskById } from '../api/taskApi';

/** Fetches and caches a single task by id. Disabled when `taskId` is empty. */
export function useTask(taskId: string) {
  return useQuery({
    queryKey: queryKeys.tasks.detail(taskId),
    queryFn: () => getTaskById(taskId),
    enabled: Boolean(taskId),
  });
}
