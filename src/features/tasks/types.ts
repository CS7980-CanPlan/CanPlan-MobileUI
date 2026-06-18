/**
 * Raw backend (AppSync) shapes for the tasks feature. The UI never sees these;
 * `mappers/taskMapper.ts` converts them into the shared `Task` / `TaskStep`
 * types.
 */

export interface BackendTaskStep {
  stepId: string;
  taskId?: string | null;
  order: number;
  text: string;
  /**
   * Backend `mediaRefs` is `[ID!]` — a list of MediaAsset *ids*, not embedded
   * objects. Resolving an id to a viewable URL is a separate flow
   * (`getMediaDownloadUrl`), not handled here.
   */
  mediaRefs?: string[] | null;
  /** Expected duration in seconds, when provided. */
  expectedDuration?: number | null;
}

/**
 * Backend `TaskStatus` enum — the *template* lifecycle, not a user's execution
 * progress. The user-facing progress comes from the assignment / progress
 * events (see `BackendAssignmentStatus`).
 */
export type BackendTaskStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED' | string;

export interface BackendTask {
  taskId: string;
  ownerId: string;
  title: string;
  description?: string | null;
  status: BackendTaskStatus;
  categoryId?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Backend `AssignmentStatus` enum — the user's progress on an assigned task. */
export type BackendAssignmentStatus =
  | 'ACTIVE'
  | 'COMPLETED'
  | 'PAUSED'
  | 'CANCELLED'
  | string;

export interface BackendAssignment {
  assignmentId: string;
  taskId: string;
  userId: string;
  dueDate?: string | null;
  status?: BackendAssignmentStatus | null;
  /** Whether the assignment is currently active for the user. */
  active?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}
