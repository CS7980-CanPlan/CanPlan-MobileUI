import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import type { CreateCategoryInput } from '../../../shared/api/canplanTypes';
import { queryKeys } from '../../../shared/query/queryKeys';
import { createCategory, listMyCategories } from '../api/categoryApi';

/** Paginated category list for the authenticated user, including their real default category. */
export function useMyCategories(enabled = true, limit = 50) {
  return useInfiniteQuery({
    queryKey: queryKeys.categories.mine(limit),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => listMyCategories({ limit, nextToken: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextToken ?? undefined,
    enabled,
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
