/**
 * GraphQL operation documents for the progress feature.
 *
 * Field selections follow the CanPlan 2.0 Frontend API Reference; if the
 * deployed schema differs, adjust the selection sets here only.
 */

export const LIST_PROGRESS_EVENTS_FOR_USER = /* GraphQL */ `
  query ListProgressEventsForUser(
    $userId: ID!
    $assignmentId: ID
    $limit: Int
    $nextToken: String
  ) {
    listProgressEventsForUser(
      userId: $userId
      assignmentId: $assignmentId
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        eventId
        userId
        taskId
        assignmentId
        stepId
        type
        message
        occurredAt
      }
      nextToken
    }
  }
`;
