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
      accessibilitySettings
      createdAt
    }
  }
`;

export const CREATE_USER_PROFILE = /* GraphQL */ `
  mutation CreateUserProfile($input: CreateUserProfileInput!) {
    createUserProfile(input: $input) {
      userId
      role
      displayName
      email
      organizationId
      accessibilitySettings
      createdAt
    }
  }
`;
