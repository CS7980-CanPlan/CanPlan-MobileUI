/**
 * Fake GraphQL client for the CanPlan 2.0 Mobile UI.
 *
 * This module simulates the shape of an AWS AppSync GraphQL data source using
 * in-memory mock data and artificial network latency. Components consume only
 * these async functions — they never import the mock data directly.
 *
 * REPLACING THIS LATER:
 * Swap the bodies of these functions for real `@aws-amplify/api` `generateClient()`
 * GraphQL queries (e.g. `client.graphql({ query: getMyTasks })`). As long as
 * the function signatures and return types stay the same, no screen or
 * component code needs to change.
 */

import {
  currentPrimaryUserId,
  mockCurrentUser,
  mockProgressEvents,
  mockTasks,
} from '../data/mockData';
import type {
  MyDaySummary,
  ProgressEvent,
  Task,
  UserProfile,
} from '../types';

/** Simulated network latency in milliseconds. */
const FAKE_LATENCY_MS = 350;

/**
 * Resolves with a deep copy of `data` after a short delay, mimicking an
 * async network round-trip. Returning a copy prevents callers from mutating
 * the shared mock data set.
 */
function simulateRequest<T>(data: T): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(structuredClone(data));
    }, FAKE_LATENCY_MS);
  });
}

/** Returns the profile of the currently signed-in primary user. */
export async function getMyProfile(): Promise<UserProfile> {
  return simulateRequest(mockCurrentUser);
}

/** Returns the current user's tasks, ordered by due date (earliest first). */
export async function getMyTasks(): Promise<Task[]> {
  const tasks = mockTasks
    .filter((task) => task.assignedUserId === currentPrimaryUserId)
    .sort((a, b) => {
      const aDue = a.dueDate ?? '';
      const bDue = b.dueDate ?? '';
      return aDue.localeCompare(bDue);
    });

  return simulateRequest(tasks);
}

/** Returns a single task by id, or null when not found. */
export async function getTaskById(taskId: string): Promise<Task | null> {
  const task = mockTasks.find(
    (candidate) =>
      candidate.id === taskId &&
      candidate.assignedUserId === currentPrimaryUserId,
  );

  return simulateRequest(task ?? null);
}

/** Returns aggregated counts for the home screen's "My day" summary. */
export async function getMyDaySummary(): Promise<MyDaySummary> {
  const myTasks = mockTasks.filter(
    (task) => task.assignedUserId === currentPrimaryUserId,
  );

  const summary: MyDaySummary = {
    tasksToday: myTasks.length,
    stepsRemaining: myTasks.reduce(
      (count, task) =>
        count + task.steps.filter((step) => !step.completed).length,
      0,
    ),
    completedToday: myTasks.filter((task) => task.status === 'completed').length,
  };

  return simulateRequest(summary);
}

/**
 * Returns the most recent progress events for the current user, newest first.
 *
 * @param limit Maximum number of events to return (default 5).
 */
export async function getMyRecentActivity(limit = 5): Promise<ProgressEvent[]> {
  const events = mockProgressEvents
    .filter((event) => event.userId === currentPrimaryUserId)
    .sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    )
    .slice(0, limit);

  return simulateRequest(events);
}
