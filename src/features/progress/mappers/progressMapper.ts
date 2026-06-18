/**
 * Pure mappers: backend progress shapes -> shared UI domain types.
 * No network access.
 */

import type { ProgressEvent, ProgressEventType } from '../../../shared/types';
import type { BackendProgressEvent } from '../types';

/** Maps a backend progress event type onto the mobile `ProgressEventType`. */
export function mapEventType(
  type: string | null | undefined,
): ProgressEventType {
  switch ((type ?? '').toUpperCase()) {
    case 'TASK_STARTED':
      return 'task_started';
    case 'TASK_COMPLETED':
      return 'task_completed';
    case 'HELP_REQUESTED':
      return 'help_requested';
    case 'STEP_COMPLETED':
    default:
      return 'step_completed';
  }
}

export function mapProgressEvent(event: BackendProgressEvent): ProgressEvent {
  return {
    id: event.eventId,
    type: mapEventType(event.type),
    userId: event.userId,
    taskId: event.taskId ?? undefined,
    message: event.message ?? '',
    occurredAt: event.occurredAt,
  };
}
