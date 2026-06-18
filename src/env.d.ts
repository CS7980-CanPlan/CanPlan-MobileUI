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
    readonly [key: string]: string | undefined;
  };
};
