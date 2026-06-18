/**
 * GraphQL operation documents for the tasks feature.
 *
 * Field selections follow the CanPlan 2.0 Frontend API Reference; if the
 * deployed schema differs, adjust the selection sets here only.
 */

export const LIST_ASSIGNMENTS_FOR_USER = /* GraphQL */ `
  query ListAssignmentsForUser($userId: ID!, $limit: Int, $nextToken: String) {
    listAssignmentsForUser(userId: $userId, limit: $limit, nextToken: $nextToken) {
      items {
        assignmentId
        taskId
        userId
        dueDate
        status
        active
        createdAt
        updatedAt
      }
      nextToken
    }
  }
`;

export const GET_TASK = /* GraphQL */ `
  query GetTask($taskId: ID!) {
    getTask(taskId: $taskId) {
      taskId
      ownerId
      title
      description
      status
      categoryId
      createdAt
      updatedAt
    }
  }
`;

export const LIST_TASK_STEPS = /* GraphQL */ `
  query ListTaskSteps($taskId: ID!, $limit: Int, $nextToken: String) {
    listTaskSteps(taskId: $taskId, limit: $limit, nextToken: $nextToken) {
      items {
        stepId
        taskId
        order
        text
        mediaRefs {
          mediaId
          type
          url
          s3Key
        }
        expectedDuration
      }
      nextToken
    }
  }
`;
