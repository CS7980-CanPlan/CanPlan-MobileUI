/**
 * Pure mappers: backend task shapes -> shared UI domain types.
 * No network access.
 */

import type { Task, TaskStatus, TaskStep } from '../../../shared/types';
import type {
  BackendAssignment,
  BackendTask,
  BackendTaskStep,
} from '../types';

/** Maps a backend status string onto the mobile `TaskStatus` enum. */
export function mapTaskStatus(status: string | null | undefined): TaskStatus {
  switch ((status ?? '').toUpperCase()) {
    case 'IN_PROGRESS':
    case 'STARTED':
    case 'ACTIVE':
      return 'in_progress';
    case 'COMPLETED':
    case 'COMPLETE':
    case 'DONE':
      return 'completed';
    case 'NOT_STARTED':
    case 'PENDING':
    case 'TODO':
    case 'NEW':
    default:
      return 'not_started';
  }
}

export function mapTaskStep(step: BackendTaskStep): TaskStep {
  const media = step.mediaRefs ?? [];
  const image = media.find((m) => (m.type ?? '').toUpperCase() === 'IMAGE');
  const audio = media.find((m) => (m.type ?? '').toUpperCase() === 'AUDIO');

  return {
    id: step.stepId,
    title: step.text,
    // Per-user step completion comes from progress events, not the step record
    // itself, so steps default to incomplete here.
    completed: false,
    order: step.order,
    imageUrl: image?.url ?? undefined,
    audioUrl: audio?.url ?? undefined,
  };
}

/**
 * Merges a backend task, its steps, and (optionally) the assignment that links
 * it to the current user into a single mobile `Task`. Assignment data takes
 * precedence for user-facing status and due date.
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
    status: mapTaskStatus(assignment?.status ?? task.status),
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
