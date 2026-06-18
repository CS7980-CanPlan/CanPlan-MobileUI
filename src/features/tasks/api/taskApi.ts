/**
 * Tasks feature API facade.
 *
 * Orchestrates the GraphQL task operations (with pagination) and maps backend
 * shapes onto the shared `Task` type. "My tasks" is assembled by listing the
 * current user's assignments, then fetching each referenced task and its steps
 * and merging the assignment's scheduling/status data on top.
 *
 * Screens consume this only through the `useTasks` / `useTask` hooks.
 */

import { getCurrentUserId } from '../../../shared/api/authTokenProvider';
import { graphqlRequest } from '../../../shared/api/graphqlClient';
import { fetchAllPages, type Connection } from '../../../shared/api/pagination';
import type { Task } from '../../../shared/types';
import {
  GET_TASK,
  LIST_ASSIGNMENTS_FOR_USER,
  LIST_TASK_STEPS,
} from '../graphql/taskOperations';
import { byDueDate, mapTask } from '../mappers/taskMapper';
import type {
  BackendAssignment,
  BackendTask,
  BackendTaskStep,
} from '../types';

/** Page size used when draining paginated list queries. */
const PAGE_SIZE = 50;

interface ListAssignmentsData {
  listAssignmentsForUser: Connection<BackendAssignment>;
}
interface GetTaskData {
  getTask: BackendTask | null;
}
interface ListTaskStepsData {
  listTaskSteps: Connection<BackendTaskStep>;
}

/** Fetches all steps for a task, draining pagination. */
async function fetchTaskSteps(taskId: string): Promise<BackendTaskStep[]> {
  return fetchAllPages<BackendTaskStep>(async (nextToken) => {
    const data = await graphqlRequest<
      ListTaskStepsData,
      { taskId: string; limit: number; nextToken?: string }
    >(LIST_TASK_STEPS, { taskId, limit: PAGE_SIZE, nextToken });
    return data.listTaskSteps;
  });
}

/**
 * Fetches a task and its steps and maps them into a mobile `Task`. Returns null
 * if the task no longer exists. An optional assignment supplies due date and
 * user-facing status.
 */
async function buildTask(
  taskId: string,
  assignment?: BackendAssignment,
): Promise<Task | null> {
  const [taskData, steps] = await Promise.all([
    graphqlRequest<GetTaskData, { taskId: string }>(GET_TASK, { taskId }),
    fetchTaskSteps(taskId),
  ]);

  if (!taskData.getTask) {
    return null;
  }

  return mapTask(taskData.getTask, steps, assignment);
}

/** Returns the current user's tasks, ordered by due date (earliest first). */
export async function getMyTasks(): Promise<Task[]> {
  const userId = await getCurrentUserId();

  const assignments = await fetchAllPages<BackendAssignment>(
    async (nextToken) => {
      const data = await graphqlRequest<
        ListAssignmentsData,
        { userId: string; limit: number; nextToken?: string }
      >(LIST_ASSIGNMENTS_FOR_USER, { userId, limit: PAGE_SIZE, nextToken });
      return data.listAssignmentsForUser;
    },
  );

  const activeAssignments = assignments.filter((a) => a.active !== false);

  const tasks = await Promise.all(
    activeAssignments.map((assignment) =>
      buildTask(assignment.taskId, assignment),
    ),
  );

  return tasks.filter((task): task is Task => task !== null).sort(byDueDate);
}

/** Returns a single task by id, or null when not found. */
export async function getTaskById(taskId: string): Promise<Task | null> {
  return buildTask(taskId);
}
