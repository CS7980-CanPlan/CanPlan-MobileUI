import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '../../../shared/query/queryKeys';
import { getTaskById } from '../api/taskApi';

/** Fetches a reusable task template. Fetch its steps with `useTaskSteps`. */
export function useTask(taskId: string) {
  return useQuery({
    queryKey: queryKeys.tasks.detail(taskId),
    queryFn: () => getTaskById(taskId),
    enabled: Boolean(taskId),
  });
}
