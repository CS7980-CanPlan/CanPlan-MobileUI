import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import type {
  CreateAssignmentInput,
  DeleteAssignmentInput,
  SetAssignmentStepCompletionInput,
  UpdateAssignmentStatusInput,
} from '../../../shared/api/canplanTypes';
import { queryKeys } from '../../../shared/query/queryKeys';
import {
  createAssignment,
  deleteAssignment,
  listAssignmentSteps,
  listMyAssignments,
  listAssignmentsForUser,
  setAssignmentStepCompletion,
  updateAssignmentStatus,
} from '../api/assignmentApi';

/** Paginated assignments for a user. Use the caller's Cognito sub for self-scoped use. */
export function useAssignmentsForUser(userId: string, limit = 50) {
  return useInfiniteQuery({
    queryKey: queryKeys.assignments.user(userId, limit),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      listAssignmentsForUser(userId, { limit, nextToken: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextToken ?? undefined,
    enabled: Boolean(userId),
  });
}

/** Paginated assignments for the signed-in user, scoped to the Cognito sub. */
export function useMyAssignments(limit = 50) {
  return useInfiniteQuery({
    queryKey: queryKeys.assignments.mine(limit),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => listMyAssignments({ limit, nextToken: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextToken ?? undefined,
  });
}

/** Ordered completion snapshots for one assignment. */
export function useAssignmentSteps(userId: string, assignmentId: string, limit = 50) {
  return useInfiniteQuery({
    queryKey: queryKeys.assignments.steps(userId, assignmentId, limit),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      listAssignmentSteps(userId, assignmentId, { limit, nextToken: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextToken ?? undefined,
    enabled: Boolean(userId) && Boolean(assignmentId),
  });
}

function useAssignmentMutation<TInput, TResult>(
  mutationFn: (input: TInput) => Promise<TResult>,
) {
  const queryClient = useQueryClient();

  return useMutation<TResult, Error, TInput>({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });
    },
  });
}

export function useCreateAssignment() {
  return useAssignmentMutation((input: CreateAssignmentInput) => createAssignment(input));
}

export function useUpdateAssignmentStatus() {
  return useAssignmentMutation((input: UpdateAssignmentStatusInput) =>
    updateAssignmentStatus(input),
  );
}

export function useSetAssignmentStepCompletion() {
  return useAssignmentMutation((input: SetAssignmentStepCompletionInput) =>
    setAssignmentStepCompletion(input),
  );
}

export function useDeleteAssignment() {
  return useAssignmentMutation((input: DeleteAssignmentInput) => deleteAssignment(input));
}
