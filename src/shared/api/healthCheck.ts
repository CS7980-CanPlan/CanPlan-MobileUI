/**
 * Development connectivity utility.
 *
 * `healthCheck` is not tied to any feature and not used by the UI; it pings the
 * API's `healthCheck` query to verify endpoint + auth wiring. It lives in the
 * shared layer because it is cross-cutting.
 */

import { graphqlRequest } from './graphqlClient';

const HEALTH_CHECK = /* GraphQL */ `
  query HealthCheck {
    healthCheck
  }
`;

interface HealthCheckData {
  healthCheck: unknown;
}

/** Pings the API's `healthCheck` query to verify connectivity and auth wiring. */
export async function healthCheck(): Promise<unknown> {
  const data = await graphqlRequest<HealthCheckData>(HEALTH_CHECK);
  return data.healthCheck;
}
