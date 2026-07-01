/** Schema-aligned task-assignment / task-instance API facade. */

import { getCurrentUserId } from '../../../shared/api/authTokenProvider';
import { canPlanApi } from '../../../shared/api/canplanApi';
import type {
  CancelTaskInstanceInput,
  CreateTaskAssignmentInput,
  DeleteTaskAssignmentInput,
  EndTaskAssignmentInput,
  PageInput,
  SetTaskInstanceStepCompletionInput,
  StartTaskInstanceInput,
  UpdateTaskInstanceStatusInput,
} from '../../../shared/api/canplanTypes';

export { canPlanApi as assignmentsApi };

export function listTaskAssignmentsForUser(userId: string, page?: PageInput) {
  return canPlanApi.listTaskAssignmentsForUser(userId, page);
}

/** Convenience for current-user assignment lists; always scopes to the Cognito sub. */
export async function listMyAssignments(page?: PageInput) {
  return canPlanApi.listTaskAssignmentsForUser(await getCurrentUserId(), page);
}

export function listTaskInstanceSteps(
  userId: string,
  instanceId: string,
  page?: PageInput,
) {
  return canPlanApi.listTaskInstanceSteps(userId, instanceId, page);
}

/** The calendar feed over [startDate, endDate] (both YYYY-MM-DD). */
export function getTaskInstanceViews(userId: string, startDate: string, endDate: string) {
  return canPlanApi.getTaskInstanceViews(userId, startDate, endDate);
}

export function createTaskAssignment(input: CreateTaskAssignmentInput) {
  return canPlanApi.createTaskAssignment(input);
}

export function startTaskInstance(input: StartTaskInstanceInput) {
  return canPlanApi.startTaskInstance(input);
}

export function updateTaskInstanceStatus(input: UpdateTaskInstanceStatusInput) {
  return canPlanApi.updateTaskInstanceStatus(input);
}

export function setTaskInstanceStepCompletion(input: SetTaskInstanceStepCompletionInput) {
  return canPlanApi.setTaskInstanceStepCompletion(input);
}

export function cancelTaskInstance(input: CancelTaskInstanceInput) {
  return canPlanApi.cancelTaskInstance(input);
}

export function endTaskAssignment(input: EndTaskAssignmentInput) {
  return canPlanApi.endTaskAssignment(input);
}

export function deleteTaskAssignment(input: DeleteTaskAssignmentInput) {
  return canPlanApi.deleteTaskAssignment(input);
}
