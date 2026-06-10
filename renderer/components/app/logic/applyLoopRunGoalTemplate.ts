import type {
  ApplyLoopRunGoalTemplateInput,
  ApplyLoopRunGoalTemplateResult
} from "@/components/app/types/loopRunGoalTemplates.types";
import type { LoopRunGoalKind } from "@/components/app/types/loopDesigner.types";

function resolveGoalKind(
  preferred: ApplyLoopRunGoalTemplateInput["template"]["goalKind"],
  specsAvailable: boolean,
  tasksAvailable: boolean
): LoopRunGoalKind {
  if (preferred === "spec" && specsAvailable) {
    return "spec";
  }
  if (preferred === "task" && tasksAvailable) {
    return "task";
  }
  return "custom";
}

export function applyLoopRunGoalTemplate(input: ApplyLoopRunGoalTemplateInput): ApplyLoopRunGoalTemplateResult {
  const goalKind = resolveGoalKind(input.template.goalKind, input.specsAvailable, input.tasksAvailable);
  return {
    goalKind,
    selectedSpecPath: input.selectedSpecPath,
    selectedTaskPath: input.selectedTaskPath,
    objective: input.template.objective,
    limitsDraft: {
      ...input.limitsDraft,
      ...input.template.limits
    }
  };
}
