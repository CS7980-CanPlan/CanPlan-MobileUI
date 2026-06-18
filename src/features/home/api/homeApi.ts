/**
 * Home feature API facade.
 *
 * The day summary is derived purely from the current user's tasks. The
 * derivation lives in `computeDaySummary` so it can be reused by the
 * `useHomeData` hook against already-cached task data — avoiding a second
 * network fetch of the task list on the home screen.
 */

import { getMyTasks } from '../../tasks/api/taskApi';
import type { MyDaySummary, Task } from '../../../shared/types';

/** Computes the "My day" summary counts from a list of tasks. Pure function. */
export function computeDaySummary(tasks: Task[]): MyDaySummary {
  return {
    tasksToday: tasks.length,
    stepsRemaining: tasks.reduce(
      (count, task) =>
        count + task.steps.filter((step) => !step.completed).length,
      0,
    ),
    completedToday: tasks.filter((task) => task.status === 'completed').length,
  };
}

/**
 * Returns aggregated counts for the home screen's "My day" summary.
 *
 * Note: the home screen itself derives the summary from already-cached tasks
 * via `useHomeData` to avoid fetching the task list twice. This standalone
 * function is kept for callers that need the summary in isolation.
 */
export async function getMyDaySummary(): Promise<MyDaySummary> {
  const tasks = await getMyTasks();
  return computeDaySummary(tasks);
}
