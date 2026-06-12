/**
 * Mock data for the CanPlan 2.0 Mobile UI.
 *
 * This module is the ONLY place raw fake data lives. Components must never
 * import from here directly — they go through `src/api/fakeGraphqlClient.ts`,
 * which mimics async GraphQL behavior. When the real AppSync backend is
 * wired up, this file can be deleted and the API layer reimplemented.
 *
 * The data is written from the perspective of a single signed-in primary
 * user (the person who uses CanPlan to complete tasks), as opposed to the
 * Supporter Web Portal's data which is scoped to a supporter.
 */

import type { ProgressEvent, Task, UserProfile } from '../types';

/** The currently signed-in primary user (mocked, no real auth yet). */
export const currentPrimaryUserId = 'user-1';

export const mockCurrentUser: UserProfile = {
  id: currentPrimaryUserId,
  fullName: 'Avery Johnson',
  email: 'avery.johnson@example.com',
  lastActiveAt: '2026-06-11T08:15:00Z',
  status: 'active',
};

export const mockTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Morning routine',
    description: 'Complete the morning self-care checklist.',
    status: 'in_progress',
    assignedUserId: currentPrimaryUserId,
    createdAt: '2026-06-01T09:00:00Z',
    updatedAt: '2026-06-11T08:10:00Z',
    dueDate: '2026-06-11T12:00:00Z',
    steps: [
      {
        id: 'step-1-1',
        title: 'Brush teeth',
        completed: true,
        order: 1,
        instructions: 'Use the toothbrush by the sink. Brush for two minutes.',
      },
      {
        id: 'step-1-2',
        title: 'Take medication',
        completed: true,
        order: 2,
        instructions: 'Take the morning pills from the labelled container.',
      },
      {
        id: 'step-1-3',
        title: 'Eat breakfast',
        completed: false,
        order: 3,
        instructions: 'Make toast and pour a glass of juice.',
      },
    ],
  },
  {
    id: 'task-5',
    title: 'Prepare lunch',
    description: 'Make a simple sandwich and clean up.',
    status: 'not_started',
    assignedUserId: currentPrimaryUserId,
    createdAt: '2026-06-11T11:30:00Z',
    updatedAt: '2026-06-11T11:30:00Z',
    dueDate: '2026-06-11T13:00:00Z',
    steps: [
      { id: 'step-5-1', title: 'Gather ingredients', completed: false, order: 1 },
      { id: 'step-5-2', title: 'Assemble sandwich', completed: false, order: 2 },
      { id: 'step-5-3', title: 'Clean counter', completed: false, order: 3 },
    ],
  },
  {
    id: 'task-6',
    title: 'Afternoon walk',
    description: 'Take a 20-minute walk around the block.',
    status: 'not_started',
    assignedUserId: currentPrimaryUserId,
    createdAt: '2026-06-10T17:00:00Z',
    updatedAt: '2026-06-10T17:00:00Z',
    dueDate: '2026-06-11T16:00:00Z',
    steps: [
      { id: 'step-6-1', title: 'Put on shoes', completed: false, order: 1 },
      { id: 'step-6-2', title: 'Bring water bottle', completed: false, order: 2 },
      { id: 'step-6-3', title: 'Walk to the park and back', completed: false, order: 3 },
    ],
  },
];

export const mockProgressEvents: ProgressEvent[] = [
  {
    id: 'event-1',
    type: 'step_completed',
    userId: currentPrimaryUserId,
    taskId: 'task-1',
    message: 'You completed step "Take medication".',
    occurredAt: '2026-06-11T08:12:00Z',
  },
  {
    id: 'event-2',
    type: 'step_completed',
    userId: currentPrimaryUserId,
    taskId: 'task-1',
    message: 'You completed step "Brush teeth".',
    occurredAt: '2026-06-11T07:55:00Z',
  },
  {
    id: 'event-3',
    type: 'task_started',
    userId: currentPrimaryUserId,
    taskId: 'task-1',
    message: 'You started "Morning routine".',
    occurredAt: '2026-06-11T07:50:00Z',
  },
];
