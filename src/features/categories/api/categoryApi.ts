/** Schema-aligned category API facade. */

import { canPlanApi } from '../../../shared/api/canplanApi';
import type { CreateCategoryInput, PageInput } from '../../../shared/api/canplanTypes';

export { canPlanApi as categoriesApi };

export function listMyCategories(page?: PageInput) {
  return canPlanApi.listMyCategories(page);
}

export function createCategory(input: CreateCategoryInput) {
  return canPlanApi.createCategory(input);
}
