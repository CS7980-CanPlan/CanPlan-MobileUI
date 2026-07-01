/**
 * Typed CanPlan API client.
 *
 * This is the only layer that knows GraphQL document names and AWSJSON's
 * string-on-the-wire representation. Feature APIs and hooks consume this
 * module's schema-shaped TypeScript contract instead.
 */

import { GraphQLRequestError } from './errors';
import { graphqlRequest } from './graphqlClient';
import * as operations from './canplanOperations';
import type {
  CancelTaskInstanceInput,
  Category,
  Connection,
  CreateCategoryInput,
  CreateMediaAssetInput,
  CreateMediaUploadUrlInput,
  CreateMyUserProfileInput,
  CreateSupportLinkInput,
  CreateTaskAssignmentInput,
  CreateTaskCoverImageUploadUrlInput,
  CreateTaskInput,
  CreateTaskStepInput,
  DeleteCategoryInput,
  DeleteMediaAssetInput,
  DeleteTaskAssignmentInput,
  DeleteTaskStepInput,
  EndTaskAssignmentInput,
  GenerateTaskStepsInput,
  JsonValue,
  MediaAsset,
  MediaDownloadTarget,
  MediaUploadTarget,
  PageInput,
  ReorderTaskStepsInput,
  SetTaskInstanceStepCompletionInput,
  StartTaskInstanceInput,
  SupportLink,
  Task,
  TaskAssignment,
  TaskInstance,
  TaskInstanceStep,
  TaskInstanceView,
  TaskStep,
  TaskStepsResponse,
  UpdateCategoryInput,
  UpdateMyUserProfileInput,
  UpdateTaskInput,
  UpdateTaskInstanceStatusInput,
  UpdateTaskStepInput,
  UserProfile,
} from './canplanTypes';

type RawUserProfile = Omit<UserProfile, 'accessibilitySettings'> & {
  accessibilitySettings?: string | null;
};

type RawSupportLink = Omit<SupportLink, 'permissions'> & {
  permissions?: string | null;
};

function parseAwsJson(
  value: string | null | undefined,
  fieldName: string,
): JsonValue | null | undefined {
  if (value === null || value === undefined) {
    return value;
  }

  try {
    return JSON.parse(value) as JsonValue;
  } catch {
    throw new GraphQLRequestError(
      `The API returned invalid AWSJSON for ${fieldName}.`,
    );
  }
}

function toAwsJson(value: JsonValue | undefined): string | undefined {
  return value === undefined ? undefined : JSON.stringify(value);
}

function mapUserProfile(profile: RawUserProfile): UserProfile {
  return {
    ...profile,
    accessibilitySettings: parseAwsJson(
      profile.accessibilitySettings,
      'UserProfile.accessibilitySettings',
    ),
  };
}

function mapSupportLink(link: RawSupportLink): SupportLink {
  return {
    ...link,
    permissions: parseAwsJson(link.permissions, 'SupportLink.permissions'),
  };
}

function mapConnection<TInput, TOutput>(
  connection: Connection<TInput>,
  mapItem: (item: TInput) => TOutput,
): Connection<TOutput> {
  return {
    items: connection.items.map(mapItem),
    nextToken: connection.nextToken,
  };
}

function pageVariables(page: PageInput): PageInput {
  return {
    limit: page.limit,
    nextToken: page.nextToken,
  };
}

/** All GraphQL queries and mutations supported by the current schema. */
export const canPlanApi = {
  async healthCheck(): Promise<string> {
    const data = await graphqlRequest<{ healthCheck: string }>(
      operations.HEALTH_CHECK,
    );
    return data.healthCheck;
  },

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const data = await graphqlRequest<{ getUserProfile: RawUserProfile | null }, { userId: string }>(
      operations.GET_USER_PROFILE,
      { userId },
    );
    return data.getUserProfile ? mapUserProfile(data.getUserProfile) : null;
  },

  async listUsersByOrganization(
    organizationId: string,
    page: PageInput = {},
  ): Promise<Connection<UserProfile>> {
    const data = await graphqlRequest<
      { listUsersByOrganization: Connection<RawUserProfile> },
      { organizationId: string } & PageInput
    >(operations.LIST_USERS_BY_ORGANIZATION, { organizationId, ...pageVariables(page) });
    return mapConnection(data.listUsersByOrganization, mapUserProfile);
  },

  async listPrimaryUsersBySupporter(
    supporterId: string,
    page: PageInput = {},
  ): Promise<Connection<SupportLink>> {
    const data = await graphqlRequest<
      { listPrimaryUsersBySupporter: Connection<RawSupportLink> },
      { supporterId: string } & PageInput
    >(operations.LIST_PRIMARY_USERS_BY_SUPPORTER, { supporterId, ...pageVariables(page) });
    return mapConnection(data.listPrimaryUsersBySupporter, mapSupportLink);
  },

  async listMyCategories(page: PageInput = {}): Promise<Connection<Category>> {
    const data = await graphqlRequest<
      { listMyCategories: Connection<Category> },
      PageInput
    >(operations.LIST_MY_CATEGORIES, pageVariables(page));
    return data.listMyCategories;
  },

  async getTask(taskId: string): Promise<Task | null> {
    const data = await graphqlRequest<{ getTask: Task | null }, { taskId: string }>(
      operations.GET_TASK,
      { taskId },
    );
    return data.getTask;
  },

  async listTaskSteps(
    taskId: string,
    page: PageInput = {},
  ): Promise<Connection<TaskStep>> {
    const data = await graphqlRequest<
      { listTaskSteps: Connection<TaskStep> },
      { taskId: string } & PageInput
    >(operations.LIST_TASK_STEPS, { taskId, ...pageVariables(page) });
    return data.listTaskSteps;
  },

  async listTasksByOwner(
    ownerId: string,
    page: PageInput = {},
  ): Promise<Connection<Task>> {
    const data = await graphqlRequest<
      { listTasksByOwner: Connection<Task> },
      { ownerId: string } & PageInput
    >(operations.LIST_TASKS_BY_OWNER, { ownerId, ...pageVariables(page) });
    return data.listTasksByOwner;
  },

  async listTasksByCategory(
    ownerId: string,
    categoryId: string,
    page: PageInput = {},
  ): Promise<Connection<Task>> {
    const data = await graphqlRequest<
      { listTasksByCategory: Connection<Task> },
      { ownerId: string; categoryId: string } & PageInput
    >(
      operations.LIST_TASKS_BY_CATEGORY,
      { ownerId, categoryId, ...pageVariables(page) },
    );
    return data.listTasksByCategory;
  },

  async listTaskAssignmentsForUser(
    userId: string,
    page: PageInput = {},
  ): Promise<Connection<TaskAssignment>> {
    const data = await graphqlRequest<
      { listTaskAssignmentsForUser: Connection<TaskAssignment> },
      { userId: string } & PageInput
    >(operations.LIST_TASK_ASSIGNMENTS_FOR_USER, { userId, ...pageVariables(page) });
    return data.listTaskAssignmentsForUser;
  },

  async getTaskInstanceViews(
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<Connection<TaskInstanceView>> {
    const data = await graphqlRequest<
      { getTaskInstanceViews: Connection<TaskInstanceView> },
      { userId: string; startDate: string; endDate: string }
    >(operations.GET_TASK_INSTANCE_VIEWS, { userId, startDate, endDate });
    return data.getTaskInstanceViews;
  },

  async listTaskInstanceSteps(
    userId: string,
    instanceId: string,
    page: PageInput = {},
  ): Promise<Connection<TaskInstanceStep>> {
    const data = await graphqlRequest<
      { listTaskInstanceSteps: Connection<TaskInstanceStep> },
      { userId: string; instanceId: string } & PageInput
    >(
      operations.LIST_TASK_INSTANCE_STEPS,
      { userId, instanceId, ...pageVariables(page) },
    );
    return data.listTaskInstanceSteps;
  },

  async getMediaDownloadUrl(
    taskId: string,
    assetId: string,
  ): Promise<MediaDownloadTarget | null> {
    const data = await graphqlRequest<
      { getMediaDownloadUrl: MediaDownloadTarget | null },
      { taskId: string; assetId: string }
    >(operations.GET_MEDIA_DOWNLOAD_URL, { taskId, assetId });
    return data.getMediaDownloadUrl;
  },

  async listMediaForTask(
    taskId: string,
    page: PageInput = {},
  ): Promise<Connection<MediaAsset>> {
    const data = await graphqlRequest<
      { listMediaForTask: Connection<MediaAsset> },
      { taskId: string } & PageInput
    >(operations.LIST_MEDIA_FOR_TASK, { taskId, ...pageVariables(page) });
    return data.listMediaForTask;
  },

  async listAllUsers(page: PageInput = {}): Promise<Connection<UserProfile>> {
    const data = await graphqlRequest<
      { listAllUsers: Connection<RawUserProfile> },
      PageInput
    >(operations.LIST_ALL_USERS, pageVariables(page));
    return mapConnection(data.listAllUsers, mapUserProfile);
  },

  async listAllTasks(page: PageInput = {}): Promise<Connection<Task>> {
    const data = await graphqlRequest<{ listAllTasks: Connection<Task> }, PageInput>(
      operations.LIST_ALL_TASKS,
      pageVariables(page),
    );
    return data.listAllTasks;
  },

  async createUserProfile(input: CreateMyUserProfileInput): Promise<UserProfile | null> {
    const data = await graphqlRequest<
      { createUserProfile: RawUserProfile | null },
      { input: Omit<CreateMyUserProfileInput, 'accessibilitySettings'> & { accessibilitySettings?: string } }
    >(operations.CREATE_USER_PROFILE, {
      input: {
        ...input,
        accessibilitySettings: toAwsJson(input.accessibilitySettings),
      },
    });
    return data.createUserProfile ? mapUserProfile(data.createUserProfile) : null;
  },

  async updateMyUserProfile(input: UpdateMyUserProfileInput): Promise<UserProfile> {
    // accessibilitySettings is AWSJSON: omitted ⇒ unchanged, explicit null ⇒
    // cleared (sent as GraphQL null, not the string "null"), object ⇒ JSON
    // string (full replacement — the API does not deep-merge).
    const accessibilitySettings =
      input.accessibilitySettings === undefined
        ? undefined
        : input.accessibilitySettings === null
          ? null
          : JSON.stringify(input.accessibilitySettings);

    const data = await graphqlRequest<
      { updateMyUserProfile: RawUserProfile },
      { input: Omit<UpdateMyUserProfileInput, 'accessibilitySettings'> & { accessibilitySettings?: string | null } }
    >(operations.UPDATE_MY_USER_PROFILE, {
      input: { ...input, accessibilitySettings },
    });
    return mapUserProfile(data.updateMyUserProfile);
  },

  async createSupportLink(input: CreateSupportLinkInput): Promise<SupportLink | null> {
    const data = await graphqlRequest<
      { createSupportLink: RawSupportLink | null },
      { input: Omit<CreateSupportLinkInput, 'permissions'> & { permissions?: string } }
    >(operations.CREATE_SUPPORT_LINK, {
      input: {
        ...input,
        permissions: toAwsJson(input.permissions),
      },
    });
    return data.createSupportLink ? mapSupportLink(data.createSupportLink) : null;
  },

  async createCategory(input: CreateCategoryInput): Promise<Category | null> {
    const data = await graphqlRequest<{ createCategory: Category | null }, { input: CreateCategoryInput }>(
      operations.CREATE_CATEGORY,
      { input },
    );
    return data.createCategory;
  },

  async updateCategory(input: UpdateCategoryInput): Promise<Category | null> {
    const data = await graphqlRequest<{ updateCategory: Category | null }, { input: UpdateCategoryInput }>(
      operations.UPDATE_CATEGORY,
      { input },
    );
    return data.updateCategory;
  },

  async deleteCategory(input: DeleteCategoryInput): Promise<Category | null> {
    const data = await graphqlRequest<{ deleteCategory: Category | null }, { input: DeleteCategoryInput }>(
      operations.DELETE_CATEGORY,
      { input },
    );
    return data.deleteCategory;
  },

  async createTask(input: CreateTaskInput): Promise<Task | null> {
    const data = await graphqlRequest<{ createTask: Task | null }, { input: CreateTaskInput }>(
      operations.CREATE_TASK,
      { input },
    );
    return data.createTask;
  },

  async updateTask(input: UpdateTaskInput): Promise<Task | null> {
    const data = await graphqlRequest<{ updateTask: Task | null }, { input: UpdateTaskInput }>(
      operations.UPDATE_TASK,
      { input },
    );
    return data.updateTask;
  },

  async createTaskStep(input: CreateTaskStepInput): Promise<TaskStep | null> {
    const data = await graphqlRequest<{ createTaskStep: TaskStep | null }, { input: CreateTaskStepInput }>(
      operations.CREATE_TASK_STEP,
      { input },
    );
    return data.createTaskStep;
  },

  async updateTaskStep(input: UpdateTaskStepInput): Promise<TaskStep | null> {
    const data = await graphqlRequest<{ updateTaskStep: TaskStep | null }, { input: UpdateTaskStepInput }>(
      operations.UPDATE_TASK_STEP,
      { input },
    );
    return data.updateTaskStep;
  },

  async deleteTaskStep(input: DeleteTaskStepInput): Promise<TaskStep | null> {
    const data = await graphqlRequest<{ deleteTaskStep: TaskStep | null }, { input: DeleteTaskStepInput }>(
      operations.DELETE_TASK_STEP,
      { input },
    );
    return data.deleteTaskStep;
  },

  async reorderTaskSteps(input: ReorderTaskStepsInput): Promise<TaskStep[]> {
    const data = await graphqlRequest<{ reorderTaskSteps: TaskStep[] }, { input: ReorderTaskStepsInput }>(
      operations.REORDER_TASK_STEPS,
      { input },
    );
    return data.reorderTaskSteps;
  },

  async deleteTask(taskId: string): Promise<Task | null> {
    const data = await graphqlRequest<{ deleteTask: Task | null }, { taskId: string }>(
      operations.DELETE_TASK,
      { taskId },
    );
    return data.deleteTask;
  },

  async createTaskAssignment(input: CreateTaskAssignmentInput): Promise<TaskAssignment> {
    const data = await graphqlRequest<
      { createTaskAssignment: TaskAssignment },
      { input: CreateTaskAssignmentInput }
    >(operations.CREATE_TASK_ASSIGNMENT, { input });
    return data.createTaskAssignment;
  },

  async startTaskInstance(input: StartTaskInstanceInput): Promise<TaskInstance> {
    const data = await graphqlRequest<
      { startTaskInstance: TaskInstance },
      { input: StartTaskInstanceInput }
    >(operations.START_TASK_INSTANCE, { input });
    return data.startTaskInstance;
  },

  async updateTaskInstanceStatus(
    input: UpdateTaskInstanceStatusInput,
  ): Promise<TaskInstance> {
    const data = await graphqlRequest<
      { updateTaskInstanceStatus: TaskInstance },
      { input: UpdateTaskInstanceStatusInput }
    >(operations.UPDATE_TASK_INSTANCE_STATUS, { input });
    return data.updateTaskInstanceStatus;
  },

  async setTaskInstanceStepCompletion(
    input: SetTaskInstanceStepCompletionInput,
  ): Promise<TaskInstanceStep> {
    const data = await graphqlRequest<
      { setTaskInstanceStepCompletion: TaskInstanceStep },
      { input: SetTaskInstanceStepCompletionInput }
    >(operations.SET_TASK_INSTANCE_STEP_COMPLETION, { input });
    return data.setTaskInstanceStepCompletion;
  },

  async cancelTaskInstance(input: CancelTaskInstanceInput): Promise<TaskInstance> {
    const data = await graphqlRequest<
      { cancelTaskInstance: TaskInstance },
      { input: CancelTaskInstanceInput }
    >(operations.CANCEL_TASK_INSTANCE, { input });
    return data.cancelTaskInstance;
  },

  async endTaskAssignment(input: EndTaskAssignmentInput): Promise<TaskAssignment> {
    const data = await graphqlRequest<
      { endTaskAssignment: TaskAssignment },
      { input: EndTaskAssignmentInput }
    >(operations.END_TASK_ASSIGNMENT, { input });
    return data.endTaskAssignment;
  },

  async deleteTaskAssignment(input: DeleteTaskAssignmentInput): Promise<TaskAssignment> {
    const data = await graphqlRequest<
      { deleteTaskAssignment: TaskAssignment },
      { input: DeleteTaskAssignmentInput }
    >(operations.DELETE_TASK_ASSIGNMENT, { input });
    return data.deleteTaskAssignment;
  },

  async createMediaUploadUrl(
    input: CreateMediaUploadUrlInput,
  ): Promise<MediaUploadTarget | null> {
    const data = await graphqlRequest<
      { createMediaUploadUrl: MediaUploadTarget | null },
      { input: CreateMediaUploadUrlInput }
    >(operations.CREATE_MEDIA_UPLOAD_URL, { input });
    return data.createMediaUploadUrl;
  },

  async createMediaAsset(input: CreateMediaAssetInput): Promise<MediaAsset | null> {
    const data = await graphqlRequest<{ createMediaAsset: MediaAsset | null }, { input: CreateMediaAssetInput }>(
      operations.CREATE_MEDIA_ASSET,
      { input },
    );
    return data.createMediaAsset;
  },

  async createTaskCoverImageUploadUrl(
    input: CreateTaskCoverImageUploadUrlInput,
  ): Promise<MediaUploadTarget> {
    const data = await graphqlRequest<
      { createTaskCoverImageUploadUrl: MediaUploadTarget },
      { input: CreateTaskCoverImageUploadUrlInput }
    >(operations.CREATE_TASK_COVER_IMAGE_UPLOAD_URL, { input });
    return data.createTaskCoverImageUploadUrl;
  },

  async deleteMediaAsset(input: DeleteMediaAssetInput): Promise<MediaAsset | null> {
    const data = await graphqlRequest<{ deleteMediaAsset: MediaAsset | null }, { input: DeleteMediaAssetInput }>(
      operations.DELETE_MEDIA_ASSET,
      { input },
    );
    return data.deleteMediaAsset;
  },

  async generateTaskSteps(input: GenerateTaskStepsInput): Promise<TaskStepsResponse> {
    const data = await graphqlRequest<
      { generateTaskSteps: TaskStepsResponse },
      { input: GenerateTaskStepsInput }
    >(operations.GENERATE_TASK_STEPS, { input });
    return data.generateTaskSteps;
  },
};
