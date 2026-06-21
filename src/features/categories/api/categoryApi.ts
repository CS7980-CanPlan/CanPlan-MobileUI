/** Schema-aligned category API facade. */

import { canPlanApi } from '../../../shared/api/canplanApi';
import type { CreateCategoryInput, PageInput } from '../../../shared/api/canplanTypes';

export { canPlanApi as categoriesApi };

export function listCategoriesByOwner(ownerId: string, page?: PageInput) {
  return canPlanApi.listCategoriesByOwner(ownerId, page);
}

export function createCategory(input: CreateCategoryInput) {
  return canPlanApi.createCategory(input);
}
