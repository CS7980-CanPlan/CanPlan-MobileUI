import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import type { CreateCategoryInput } from '../../../shared/api/canplanTypes';
import { queryKeys } from '../../../shared/query/queryKeys';
import { createCategory, listCategoriesByOwner } from '../api/categoryApi';

/** Paginated category list for one owner. NO_CATEGORY is an implicit task bucket, not an item here. */
export function useCategoriesByOwner(ownerId: string, limit = 50) {
  return useInfiniteQuery({
    queryKey: queryKeys.categories.owner(ownerId, limit),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      listCategoriesByOwner(ownerId, { limit, nextToken: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextToken ?? undefined,
    enabled: Boolean(ownerId),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCategoryInput) => createCategory(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}
