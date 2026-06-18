/**
 * Lightweight fetch-based AWS AppSync GraphQL client.
 *
 * There is a single AppSync POST endpoint. Every request sends a JSON body of
 * `{ query, variables }` with a `Content-Type` and a Cognito ID token in the
 * `Authorization` header. The token comes from the pluggable auth provider in
 * `authTokenProvider.ts` so this layer stays independent of how auth is wired.
 *
 * This client only performs network requests; it never manages UI state. Query
 * caching, loading/error state, retries, and deduplication are handled one
 * layer up by TanStack Query (see `src/shared/query`).
 *
 * Error handling is deliberate because AppSync reports problems in several
 * ways: field-level GraphQL errors arrive with HTTP 200 and an `errors` array,
 * while auth failures arrive as HTTP 401. `graphqlRequest` normalizes all of
 * these into a single `GraphQLRequestError` and preserves the first GraphQL
 * error message where possible.
 */

import { getIdToken } from './authTokenProvider';
import { GraphQLRequestError, type GraphQLError } from './errors';

/** The envelope every GraphQL endpoint returns. */
interface GraphQLResponse<TData> {
  data?: TData | null;
  errors?: GraphQLError[];
}

/** Returns the configured endpoint, or throws a clear setup error. */
function resolveEndpoint(): string {
  const url = process.env.EXPO_PUBLIC_GRAPHQL_URL;
  if (!url) {
    throw new GraphQLRequestError(
      'EXPO_PUBLIC_GRAPHQL_URL is not set. Add it to your .env / .env.local ' +
        'file (see README) before making real API calls.',
    );
  }
  return url;
}

/**
 * Executes a GraphQL operation against the AppSync endpoint.
 *
 * @typeParam TData      Shape of the expected `data` payload.
 * @typeParam TVariables Shape of the operation variables.
 * @throws {GraphQLRequestError} for missing env var, missing/expired auth
 *   token, network failure, HTTP error, malformed JSON, or GraphQL errors.
 */
export async function graphqlRequest<
  TData,
  TVariables extends Record<string, unknown> | undefined = undefined,
>(query: string, variables?: TVariables): Promise<TData> {
  const url = resolveEndpoint();

  // Throws a descriptive error when auth is not configured / no token yet.
  const token = await getIdToken();

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token,
      },
      body: JSON.stringify({ query, variables: variables ?? {} }),
    });
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    throw new GraphQLRequestError(
      `Network request to the GraphQL endpoint failed: ${detail}`,
    );
  }

  if (response.status === 401) {
    throw new GraphQLRequestError(
      'Unauthorized (HTTP 401). The Cognito ID token is missing, invalid, or ' +
        'expired (UnauthorizedException).',
      { statusCode: 401 },
    );
  }

  const rawBody = await response.text();

  let body: GraphQLResponse<TData>;
  try {
    body = JSON.parse(rawBody) as GraphQLResponse<TData>;
  } catch {
    throw new GraphQLRequestError(
      `GraphQL endpoint returned malformed JSON (HTTP ${response.status}): ` +
        `${rawBody.slice(0, 200)}`,
      { statusCode: response.status },
    );
  }

  // GraphQL field errors often arrive with HTTP 200 — check before `data`.
  if (body.errors && body.errors.length > 0) {
    const [first] = body.errors;
    throw new GraphQLRequestError(first?.message ?? 'GraphQL request failed.', {
      graphQLErrors: body.errors,
      statusCode: response.status,
    });
  }

  if (!response.ok) {
    throw new GraphQLRequestError(
      `GraphQL request failed with HTTP ${response.status}.`,
      { statusCode: response.status },
    );
  }

  if (body.data === null || body.data === undefined) {
    throw new GraphQLRequestError(
      'GraphQL response contained no data and no errors.',
      { statusCode: response.status },
    );
  }

  return body.data;
}
