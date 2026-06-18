/**
 * Progress feature API facade.
 *
 * Fetches progress events via the shared client and maps them onto the shared
 * `ProgressEvent` type. Screens consume this only through the
 * `useRecentActivity` hook.
 */

import { getCurrentUserId } from '../../../shared/api/authTokenProvider';
import { graphqlRequest } from '../../../shared/api/graphqlClient';
import type { Connection } from '../../../shared/api/pagination';
import type { ProgressEvent } from '../../../shared/types';
import { LIST_PROGRESS_EVENTS_FOR_USER } from '../graphql/progressOperations';
import { mapProgressEvent } from '../mappers/progressMapper';
import type { BackendProgressEvent } from '../types';

interface ListProgressEventsData {
  listProgressEventsForUser: Connection<BackendProgressEvent>;
}

/**
 * Returns the most recent progress events for the current user, newest first.
 *
 * @param limit Maximum number of events to return (default 5).
 */
export async function getMyRecentActivity(limit = 5): Promise<ProgressEvent[]> {
  const userId = await getCurrentUserId();

  const data = await graphqlRequest<
    ListProgressEventsData,
    { userId: string; limit: number; nextToken?: string }
  >(LIST_PROGRESS_EVENTS_FOR_USER, { userId, limit });

  return (data.listProgressEventsForUser.items ?? [])
    .map(mapProgressEvent)
    .sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    )
    .slice(0, limit);
}
