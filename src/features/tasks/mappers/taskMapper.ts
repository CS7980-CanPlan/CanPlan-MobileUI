/**
 * Pure mappers: backend task shapes -> shared UI domain types.
 * No network access.
 */

import type { Task, TaskStatus, TaskStep } from '../../../shared/types';
import type {
  BackendAssignment,
  BackendAssignmentStatus,
  BackendTask,
  BackendTaskStep,
} from '../types';

/**
 * Maps a backend `AssignmentStatus` onto the mobile execution `TaskStatus`.
 *
 * The mobile UI shows a user's progress (not-started / in-progress / done),
 * which lives on the *assignment*, not the task template. Granular
 * "in progress" detection would require inspecting progress events; absent
 * those, an active assignment is treated as not-yet-started and a paused one as
 * in-progress.
 */
export function mapAssignmentStatus(
  status: BackendAssignmentStatus | null | undefined,
): TaskStatus {
  switch ((status ?? '').toUpperCase()) {
    case 'COMPLETED':
      return 'completed';
    case 'PAUSED':
      return 'in_progress';
    case 'ACTIVE':
    case 'CANCELLED':
    default:
      return 'not_started';
  }
}

export function mapTaskStep(step: BackendTaskStep): TaskStep {
  return {
    id: step.stepId,
    title: step.text,
    // Per-user step completion comes from progress events, not the step record
    // itself, so steps default to incomplete here.
    completed: false,
    order: step.order,
    // `mediaRefs` are MediaAsset ids; resolving them to viewable URLs is a
    // separate flow (getMediaDownloadUrl) not wired up yet.
    imageUrl: undefined,
    audioUrl: undefined,
  };
}

/**
 * Merges a backend task, its steps, and (optionally) the assignment that links
 * it to the current user into a single mobile `Task`. The user-facing status
 * and due date come from the assignment; without one, status defaults to
 * not-started (the task template's own status is a separate lifecycle axis).
 */
export function mapTask(
  task: BackendTask,
  steps: BackendTaskStep[],
  assignment?: BackendAssignment,
): Task {
  const orderedSteps = [...steps]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map(mapTaskStep);

  return {
    id: task.taskId,
    title: task.title,
    description: task.description ?? undefined,
    status: assignment
      ? mapAssignmentStatus(assignment.status)
      : 'not_started',
    assignedUserId: assignment?.userId ?? task.ownerId,
    steps: orderedSteps,
    dueDate: assignment?.dueDate ?? undefined,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

/** Sorts tasks by due date, earliest first (tasks without a date sort last). */
export function byDueDate(a: Task, b: Task): number {
  const aDue = a.dueDate ?? '';
  const bDue = b.dueDate ?? '';
  if (!aDue) return bDue ? 1 : 0;
  if (!bDue) return -1;
  return aDue.localeCompare(bDue);
}
