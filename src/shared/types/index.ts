/**
 * Domain types for the CanPlan 2.0 Mobile UI.
 *
 * These are the UI-facing domain shapes, intentionally identical to the types
 * used by the Supporter Web Portal so both clients share a vocabulary. They are
 * backend-agnostic: each feature's mappers (`src/features/<feature>/mappers`)
 * convert the raw AppSync GraphQL shapes onto these so components and screens
 * never see backend types.
 */

/** Backend `UserRole` enum. */
export type UserRole = 'PRIMARY_USER' | 'SUPPORT_PERSON' | 'ORG_ADMIN';

/**
 * A person who uses CanPlan. Only fields the backend `UserProfile` actually
 * returns are modeled here (no avatar / last-active / status — those don't
 * exist in the backend yet).
 */
export interface UserProfile {
  /** Backend `userId`. */
  id: string;
  /** Backend `displayName`; may be empty if the user has none set. */
  displayName: string;
  email?: string;
  role?: UserRole;
  organizationId?: string;
  /** Free-form accessibility preferences (backend `AWSJSON` object). */
  accessibilitySettings?: Record<string, unknown>;
  /** ISO-8601 creation timestamp. */
  createdAt?: string;
}

/**
 * A single step within a Task. Only fields the backend `TaskStep` returns are
 * modeled (the backend has no per-step completion flag, and `mediaRefs` are
 * MediaAsset ids — resolving them to URLs is a separate flow).
 */
export interface TaskStep {
  /** Backend `stepId`. */
  id: string;
  /** Backend `text` — the step instruction. */
  text: string;
  /** Position used to order steps within a task. */
  order: number;
  /** Expected duration in seconds, when provided. */
  expectedDuration?: number;
  /** MediaAsset ids attached to this step (resolve via `getMediaDownloadUrl`). */
  mediaRefs?: string[];
}

export type TaskStatus = 'not_started' | 'in_progress' | 'completed';

/** A task assigned to a CanPlan user, composed of ordered steps. */
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  /** ID of the UserProfile this task belongs to. */
  assignedUserId: string;
  steps: TaskStep[];
  /** ISO-8601 due date, if the task has one. */
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

/** Links a supporter/admin to a user they are responsible for. */
export interface Assignment {
  id: string;
  /** ID of the supporter or admin who owns this assignment. */
  supporterId: string;
  /** ID of the supported UserProfile. */
  userId: string;
  assignedAt: string;
  role: 'supporter' | 'admin';
}

/**
 * Mirrors the backend `ProgressEventType` enum (lower-cased for the UI):
 * `STARTED`, `PAUSED`, `RESUMED`, `SKIPPED`, `COMPLETED`, `SYNCED`.
 */
export type ProgressEventType =
  | 'started'
  | 'paused'
  | 'resumed'
  | 'skipped'
  | 'completed'
  | 'synced';

/** A timeline entry describing something a user did. */
export interface ProgressEvent {
  id: string;
  type: ProgressEventType;
  userId: string;
  /** ID of the related task, when the event is task-related. */
  taskId?: string;
  /** ID of the related assignment, when present. */
  assignmentId?: string;
  /** Human-readable summary shown in activity feeds (derived from `type`). */
  message: string;
  /** ISO-8601 timestamp of when the event occurred (backend `timestamp`). */
  occurredAt: string;
}

/**
 * Summary counts shown to the primary user on the home screen. Both are derived
 * from the user's assignments (the backend has no per-step completion to count
 * "steps remaining").
 */
export interface MyDaySummary {
  tasksToday: number;
  completedToday: number;
}
