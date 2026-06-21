/**
 * Development connectivity utility.
 *
 * `healthCheck` is not tied to any feature and not used by the UI; it pings the
 * API's `healthCheck` query to verify endpoint + auth wiring. It lives in the
 * shared layer because it is cross-cutting.
 */

import { canPlanApi } from './canplanApi';

/** Pings the API's `healthCheck` query to verify connectivity and auth wiring. */
export async function healthCheck(): Promise<string> {
  return canPlanApi.healthCheck();
}
