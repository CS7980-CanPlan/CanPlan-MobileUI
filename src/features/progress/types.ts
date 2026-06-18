/**
 * Raw backend (AppSync) shapes for the progress feature. The UI never sees
 * these; `mappers/progressMapper.ts` converts them into the shared
 * `ProgressEvent` type.
 */

export interface BackendProgressEvent {
  eventId: string;
  userId: string;
  taskId?: string | null;
  assignmentId?: string | null;
  stepId?: string | null;
  /** Raw backend event type, e.g. `STEP_COMPLETED`. */
  type: string;
  message?: string | null;
  occurredAt: string;
}
