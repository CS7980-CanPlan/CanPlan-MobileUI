import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  CreateMediaAssetInput,
  CreateMediaUploadUrlInput,
  CreateTaskCoverImageUploadUrlInput,
  DeleteMediaAssetInput,
} from '../../../shared/api/canplanTypes';
import { queryKeys } from '../../../shared/query/queryKeys';
import {
  createMediaAsset,
  createMediaUploadUrl,
  createTaskCoverImageUploadUrl,
  deleteMediaAsset,
  getMediaDownloadUrl,
  listMediaForTask,
} from '../api/mediaApi';

/** Paginated metadata for all media assets belonging to a task. */
export function useMediaForTask(taskId: string, limit = 50) {
  return useInfiniteQuery({
    queryKey: queryKeys.media.task(taskId, limit),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => listMediaForTask(taskId, { limit, nextToken: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextToken ?? undefined,
    enabled: Boolean(taskId),
  });
}

/** Fetches a short-lived private-S3 download URL for an existing media asset. */
export function useMediaDownloadUrl(taskId: string, assetId: string) {
  return useQuery({
    queryKey: queryKeys.media.download(taskId, assetId),
    queryFn: () => getMediaDownloadUrl(taskId, assetId),
    enabled: Boolean(taskId) && Boolean(assetId),
    staleTime: 0,
  });
}

function useMediaMutation<TInput, TResult>(
  mutationFn: (input: TInput) => Promise<TResult>,
) {
  const queryClient = useQueryClient();

  return useMutation<TResult, Error, TInput>({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.media.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}

/** First phase of regular media upload: PUT bytes to the returned URL, then register the asset. */
export function useCreateMediaUploadUrl() {
  return useMediaMutation((input: CreateMediaUploadUrlInput) => createMediaUploadUrl(input));
}

/** Registers the S3 object returned by createMediaUploadUrl after a successful PUT. */
export function useCreateMediaAsset() {
  return useMediaMutation((input: CreateMediaAssetInput) => createMediaAsset(input));
}

/** First phase of the task-cover flow; pass its s3Key to createTask or updateTask. */
export function useCreateTaskCoverImageUploadUrl() {
  return useMediaMutation((input: CreateTaskCoverImageUploadUrlInput) =>
    createTaskCoverImageUploadUrl(input),
  );
}

export function useDeleteMediaAsset() {
  return useMediaMutation((input: DeleteMediaAssetInput) => deleteMediaAsset(input));
}
