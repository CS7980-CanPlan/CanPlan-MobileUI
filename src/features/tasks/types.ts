/**
 * Raw backend (AppSync) shapes for the tasks feature. The UI never sees these;
 * `mappers/taskMapper.ts` converts them into the shared `Task` / `TaskStep`
 * types.
 */

/** A media asset referenced by a task step (image / audio / video). */
export interface BackendMediaRef {
  mediaId?: string | null;
  /** Media kind, e.g. `IMAGE`, `AUDIO`, `VIDEO`. */
  type?: string | null;
  url?: string | null;
  s3Key?: string | null;
}

export interface BackendTaskStep {
  stepId: string;
  taskId?: string | null;
  order: number;
  text: string;
  mediaRefs?: BackendMediaRef[] | null;
  /** Expected duration in seconds, when provided. */
  expectedDuration?: number | null;
}

/** Raw backend task status string (e.g. `NOT_STARTED`, `IN_PROGRESS`). */
export type BackendTaskStatus = string;

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

export interface BackendAssignment {
  assignmentId: string;
  taskId: string;
  userId: string;
  dueDate?: string | null;
  status?: string | null;
  /** Whether the assignment is currently active for the user. */
  active?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}
