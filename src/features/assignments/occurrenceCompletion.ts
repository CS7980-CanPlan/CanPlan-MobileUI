/**
 * In-memory, UI-only step-completion store for calendar occurrences.
 *
 * Tracks which steps are checked off for a given occurrence
 * (assignment + scheduled date/time). This is intentionally NOT persisted —
 * it resets on reload — until the real backend wiring
 * (startTaskInstance / setTaskInstanceStepCompletion) is added later.
 */
import { useCallback, useSyncExternalStore } from 'react';

/** A user-applied status for a whole occurrence (UI-only, like the steps). */
export type OccurrenceStatus = 'COMPLETED' | 'SKIPPED';

const EMPTY: ReadonlySet<string> = new Set();
const store = new Map<string, ReadonlySet<string>>();
let statusSnapshot: ReadonlyMap<string, OccurrenceStatus> = new Map();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Stable key for one occurrence. */
export function occurrenceKey(
  assignmentId: string,
  scheduledDate: string,
  scheduledTime: string,
): string {
  return `${assignmentId}#${scheduledDate}#${scheduledTime}`;
}

export function toggleOccurrenceStep(key: string, stepId: string) {
  const current = store.get(key) ?? EMPTY;
  const next = new Set(current);
  if (next.has(stepId)) {
    next.delete(stepId);
  } else {
    next.add(stepId);
  }
  store.set(key, next);
  emit();
}

/** Subscribe to the completed-step set for one occurrence. */
export function useCompletedSteps(key: string): ReadonlySet<string> {
  const getSnapshot = useCallback(() => store.get(key) ?? EMPTY, [key]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function setOccurrenceStatus(key: string, status: OccurrenceStatus) {
  const next = new Map(statusSnapshot);
  next.set(key, status);
  statusSnapshot = next;
  emit();
}

/** Drop a status override (e.g. after un-skipping) so the server status shows through. */
export function clearOccurrenceStatus(key: string) {
  if (!statusSnapshot.has(key)) {
    return;
  }
  const next = new Map(statusSnapshot);
  next.delete(key);
  statusSnapshot = next;
  emit();
}

/** Subscribe to the whole map of occurrence status overrides. */
export function useOccurrenceStatuses(): ReadonlyMap<string, OccurrenceStatus> {
  return useSyncExternalStore(
    subscribe,
    () => statusSnapshot,
    () => statusSnapshot,
  );
}
