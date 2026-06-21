import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import type {
  CreateTaskInput,
  CreateTaskStepInput,
  DeleteTaskStepInput,
  UpdateTaskInput,
  UpdateTaskStepInput,
} from '../../../shared/api/canplanTypes';
import { queryKeys } from '../../../shared/query/queryKeys';
import {
  createTask,
  createTaskStep,
  deleteTask,
  deleteTaskStep,
  listAllTasks,
  listTaskSteps,
  listTasksByCategory,
  listTasksByOwner,
  updateTask,
  updateTaskStep,
} from '../api/taskApi';

/** Paginated task-template list for one owner. */
export function useTasksByOwner(ownerId: string, limit = 50) {
  return useInfiniteQuery({
    queryKey: queryKeys.tasks.owner(ownerId, limit),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => listTasksByOwner(ownerId, { limit, nextToken: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextToken ?? undefined,
    enabled: Boolean(ownerId),
  });
}

/** Paginated task-template list for one category; omit categoryId for NO_CATEGORY. */
export function useTasksByCategory(
  ownerId: string,
  categoryId: string | null | undefined,
  limit = 50,
) {
  const normalizedCategoryId = categoryId?.trim() || undefined;

  return useInfiniteQuery({
    queryKey: queryKeys.tasks.category(ownerId, normalizedCategoryId, limit),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      listTasksByCategory(ownerId, normalizedCategoryId, { limit, nextToken: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextToken ?? undefined,
    enabled: Boolean(ownerId),
  });
}

/** Paginated, ascending-order task steps. */
export function useTaskSteps(taskId: string, limit = 50) {
  return useInfiniteQuery({
    queryKey: queryKeys.tasks.steps(taskId, limit),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => listTaskSteps(taskId, { limit, nextToken: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextToken ?? undefined,
    enabled: Boolean(taskId),
  });
}

/** SystemAdmin-only paginated task listing. */
export function useAllTasks(limit = 50, enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.tasks.allAdmin(limit),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => listAllTasks({ limit, nextToken: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextToken ?? undefined,
    enabled,
  });
}

function useTaskMutation<TInput, TResult>(
  mutationFn: (input: TInput) => Promise<TResult>,
) {
  const queryClient = useQueryClient();

  return useMutation<TResult, Error, TInput>({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.media.all });
    },
  });
}

export function useCreateTask() {
  return useTaskMutation((input: CreateTaskInput) => createTask(input));
}

export function useUpdateTask() {
  return useTaskMutation((input: UpdateTaskInput) => updateTask(input));
}

export function useDeleteTask() {
  return useTaskMutation((taskId: string) => deleteTask(taskId));
}

export function useCreateTaskStep() {
  return useTaskMutation((input: CreateTaskStepInput) => createTaskStep(input));
}

export function useUpdateTaskStep() {
  return useTaskMutation((input: UpdateTaskStepInput) => updateTaskStep(input));
}

export function useDeleteTaskStep() {
  return useTaskMutation((input: DeleteTaskStepInput) => deleteTaskStep(input));
}
