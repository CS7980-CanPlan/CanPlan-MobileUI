/**
 * AppSync connection type and pagination helpers.
 */

/** A paginated AppSync connection: a page of `items` plus a cursor. */
export interface Connection<T> {
  items: T[];
  nextToken?: string | null;
}

/**
 * Drains every page of a paginated connection into a single array.
 *
 * @param fetchPage Callback that fetches one page given a `nextToken` cursor
 *   (undefined for the first page) and returns the connection.
 * @param options.maxPages Safety cap on the number of pages fetched, to avoid
 *   accidental unbounded loops. Defaults to 50.
 */
export async function fetchAllPages<T>(
  fetchPage: (nextToken?: string) => Promise<Connection<T>>,
  options?: { maxPages?: number },
): Promise<T[]> {
  const maxPages = options?.maxPages ?? 50;
  const items: T[] = [];
  let nextToken: string | undefined;
  let pages = 0;

  do {
    const page = await fetchPage(nextToken);
    if (page.items) {
      items.push(...page.items);
    }
    nextToken = page.nextToken ?? undefined;
    pages += 1;
  } while (nextToken && pages < maxPages);

  return items;
}
