/**
 * GraphQL operation documents for the users feature.
 *
 * Field selections follow the CanPlan 2.0 Frontend API Reference; if the
 * deployed schema differs, adjust the selection sets here only.
 */

export const GET_USER_PROFILE = /* GraphQL */ `
  query GetUserProfile($userId: ID!) {
    getUserProfile(userId: $userId) {
      userId
      role
      displayName
      email
      organizationId
      accessibilitySettings {
        fontScale
        highContrast
        reducedMotion
        textToSpeech
      }
      status
      createdAt
      updatedAt
    }
  }
`;
