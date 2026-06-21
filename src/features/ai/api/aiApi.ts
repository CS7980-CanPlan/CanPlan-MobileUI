/** AI task-step generation API facade. */

import { canPlanApi } from '../../../shared/api/canplanApi';
import type { GenerateTaskStepsInput } from '../../../shared/api/canplanTypes';

export { canPlanApi as aiApi };

export function generateTaskSteps(input: GenerateTaskStepsInput) {
  return canPlanApi.generateTaskSteps(input);
}
