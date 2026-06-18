/**
 * Shared error types for the GraphQL data layer.
 *
 * Every network/GraphQL failure surfaces as a single `GraphQLRequestError`, so
 * callers (feature APIs, hooks, screens) only ever handle one error shape.
 */

/** A single error entry inside a GraphQL response `errors` array. */
export interface GraphQLError {
  message: string;
  /** AppSync-specific error classifier, e.g. `UnauthorizedException`. */
  errorType?: string;
  path?: (string | number)[];
  locations?: { line: number; column: number }[];
  extensions?: Record<string, unknown>;
}

/** Error thrown for any failed GraphQL request, with structured context. */
export class GraphQLRequestError extends Error {
  /** GraphQL `errors` array, when the failure was a GraphQL-level error. */
  readonly graphQLErrors?: GraphQLError[];
  /** HTTP status code, when the failure involved an HTTP response. */
  readonly statusCode?: number;

  constructor(
    message: string,
    options?: { graphQLErrors?: GraphQLError[]; statusCode?: number },
  ) {
    super(message);
    this.name = 'GraphQLRequestError';
    this.graphQLErrors = options?.graphQLErrors;
    this.statusCode = options?.statusCode;
  }
}
