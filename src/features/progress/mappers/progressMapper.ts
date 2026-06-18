/**
 * Pure mappers: backend progress shapes -> shared UI domain types.
 * No network access.
 */

import type { ProgressEvent, ProgressEventType } from '../../../shared/types';
import type { BackendProgressEvent } from '../types';

/** Maps a backend `ProgressEventType` onto the (lower-cased) mobile enum. */
export function mapEventType(
  type: string | null | undefined,
): ProgressEventType {
  switch ((type ?? '').toUpperCase()) {
    case 'STARTED':
      return 'started';
    case 'PAUSED':
      return 'paused';
    case 'RESUMED':
      return 'resumed';
    case 'SKIPPED':
      return 'skipped';
    case 'COMPLETED':
      return 'completed';
    case 'SYNCED':
    default:
      // Unknown/future backend values fall back to the neutral 'synced' rather
      // than being mislabeled as a completion.
      return 'synced';
  }
}

/** Human-readable summary for an event type (the backend has no message). */
const EVENT_MESSAGES: Record<ProgressEventType, string> = {
  started: 'Started a task',
  paused: 'Paused a task',
  resumed: 'Resumed a task',
  skipped: 'Skipped a step',
  completed: 'Completed a task',
  synced: 'Synced progress',
};

export function mapProgressEvent(event: BackendProgressEvent): ProgressEvent {
  const type = mapEventType(event.eventType);
  return {
    id: event.eventId,
    type,
    userId: event.userId,
    taskId: event.taskId ?? undefined,
    assignmentId: event.assignmentId ?? undefined,
    message: EVENT_MESSAGES[type],
    occurredAt: event.timestamp,
  };
}
