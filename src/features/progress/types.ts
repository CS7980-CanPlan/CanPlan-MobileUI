/**
 * Raw backend (AppSync) shapes for the progress feature. The UI never sees
 * these; `mappers/progressMapper.ts` converts them into the shared
 * `ProgressEvent` type.
 */

/** Backend `ProgressEventType` enum. */
export type BackendProgressEventType =
  | 'STARTED'
  | 'PAUSED'
  | 'RESUMED'
  | 'SKIPPED'
  | 'COMPLETED'
  | 'SYNCED'
  | string;

/**
 * Raw backend ProgressEvent. Append-only event log; the entity carries an
 * `eventType` and a `timestamp` (not a `type`/`occurredAt`), an optional
 * `assignmentId`/`taskId`, a `source`, and free-form `metadata` (AWSJSON). It
 * has no human-readable message field — the UI synthesizes one from the type.
 */
export interface BackendProgressEvent {
  eventId: string;
  userId: string;
  taskId?: string | null;
  assignmentId?: string | null;
  eventType: BackendProgressEventType;
  /** ISO-8601 timestamp; defaults to creation time on the backend. */
  timestamp: string;
  source?: string | null;
}
