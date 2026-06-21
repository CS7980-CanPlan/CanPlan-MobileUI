/** Schema-aligned assignment API facade. */

import { getCurrentUserId } from '../../../shared/api/authTokenProvider';
import { canPlanApi } from '../../../shared/api/canplanApi';
import type {
  CreateAssignmentInput,
  DeleteAssignmentInput,
  PageInput,
  SetAssignmentStepCompletionInput,
  UpdateAssignmentStatusInput,
} from '../../../shared/api/canplanTypes';

export { canPlanApi as assignmentsApi };

export function listAssignmentsForUser(userId: string, page?: PageInput) {
  return canPlanApi.listAssignmentsForUser(userId, page);
}

/** Convenience for current-user assignment lists; always scopes to the Cognito sub. */
export async function listMyAssignments(page?: PageInput) {
  return canPlanApi.listAssignmentsForUser(await getCurrentUserId(), page);
}

export function listAssignmentSteps(
  userId: string,
  assignmentId: string,
  page?: PageInput,
) {
  return canPlanApi.listAssignmentSteps(userId, assignmentId, page);
}

export function createAssignment(input: CreateAssignmentInput) {
  return canPlanApi.createAssignment(input);
}

export function updateAssignmentStatus(input: UpdateAssignmentStatusInput) {
  return canPlanApi.updateAssignmentStatus(input);
}

export function setAssignmentStepCompletion(input: SetAssignmentStepCompletionInput) {
  return canPlanApi.setAssignmentStepCompletion(input);
}

export function deleteAssignment(input: DeleteAssignmentInput) {
  return canPlanApi.deleteAssignment(input);
}
