/**
 * Centralized TanStack Query keys.
 *
 * Every query/mutation hook references these so cache reads, invalidations, and
 * future mutations stay consistent. Keys are declared `as const` so they are
 * inferred as readonly tuples.
 */
export const queryKeys = {
  auth: {
    currentUser: ['auth', 'currentUser'] as const,
  },
  users: {
    myProfile: ['users', 'myProfile'] as const,
  },
  tasks: {
    all: ['tasks'] as const,
    mine: ['tasks', 'mine'] as const,
    detail: (taskId: string) => ['tasks', 'detail', taskId] as const,
  },
  home: {
    summary: ['home', 'summary'] as const,
  },
  progress: {
    recentActivity: (limit?: number) =>
      ['progress', 'recentActivity', limit] as const,
  },
};
