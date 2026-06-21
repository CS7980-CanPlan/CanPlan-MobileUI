/** Schema-aligned media metadata and presigned-URL API facade. */

import { canPlanApi } from '../../../shared/api/canplanApi';
import type {
  CreateMediaAssetInput,
  CreateMediaUploadUrlInput,
  CreateTaskCoverImageUploadUrlInput,
  DeleteMediaAssetInput,
  PageInput,
} from '../../../shared/api/canplanTypes';

export { canPlanApi as mediaApi };

export function listMediaForTask(taskId: string, page?: PageInput) {
  return canPlanApi.listMediaForTask(taskId, page);
}

export function getMediaDownloadUrl(taskId: string, assetId: string) {
  return canPlanApi.getMediaDownloadUrl(taskId, assetId);
}

export function createMediaUploadUrl(input: CreateMediaUploadUrlInput) {
  return canPlanApi.createMediaUploadUrl(input);
}

export function createMediaAsset(input: CreateMediaAssetInput) {
  return canPlanApi.createMediaAsset(input);
}

export function createTaskCoverImageUploadUrl(
  input: CreateTaskCoverImageUploadUrlInput,
) {
  return canPlanApi.createTaskCoverImageUploadUrl(input);
}

export function deleteMediaAsset(input: DeleteMediaAssetInput) {
  return canPlanApi.deleteMediaAsset(input);
}
