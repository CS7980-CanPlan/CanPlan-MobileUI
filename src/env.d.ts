/**
 * Ambient typing for the `EXPO_PUBLIC_*` environment variables this app reads.
 *
 * Expo inlines variables prefixed with `EXPO_PUBLIC_` into `process.env` at
 * build time. React Native does not ship Node's `process` types, so we declare
 * the minimal shape we rely on here.
 */
declare const process: {
  readonly env: {
    /** AWS AppSync GraphQL endpoint, e.g. https://xxx.appsync-api.<region>.amazonaws.com/graphql */
    readonly EXPO_PUBLIC_GRAPHQL_URL?: string;
    /** Cognito User Pool id (CloudFormation output `UserPoolId`), e.g. us-east-1_ABcd1234. */
    readonly EXPO_PUBLIC_COGNITO_USER_POOL_ID?: string;
    /** Cognito User Pool app client id (CloudFormation output `UserPoolClientId`). */
    readonly EXPO_PUBLIC_COGNITO_USER_POOL_CLIENT_ID?: string;
    readonly [key: string]: string | undefined;
  };
};
