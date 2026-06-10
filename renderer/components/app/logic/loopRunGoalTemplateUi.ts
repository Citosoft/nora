import type { LoopRunGoalKind } from "@/components/app/types/loopDesigner.types";

export const LOOP_RUN_SPEC_TEMPLATE_ID = "implement-spec";
export const LOOP_RUN_TASK_TEMPLATE_ID = "complete-task";
export const LOOP_RUN_REVIEW_FEEDBACK_TEMPLATE_ID = "review-feedback";

export function shouldShowLoopRunSpecPicker(selectedTemplateId: string): boolean {
  return selectedTemplateId === LOOP_RUN_SPEC_TEMPLATE_ID;
}

export function shouldShowLoopRunTaskPicker(selectedTemplateId: string): boolean {
  return selectedTemplateId === LOOP_RUN_TASK_TEMPLATE_ID;
}

export function shouldShowLoopRunReviewFeedbackPicker(selectedTemplateId: string): boolean {
  return selectedTemplateId === LOOP_RUN_REVIEW_FEEDBACK_TEMPLATE_ID;
}

export function resolveLoopRunGoalKindForTemplate(
  selectedTemplateId: string,
  specsAvailable: boolean,
  tasksAvailable: boolean
): LoopRunGoalKind {
  if (selectedTemplateId === LOOP_RUN_SPEC_TEMPLATE_ID && specsAvailable) {
    return "spec";
  }
  if (selectedTemplateId === LOOP_RUN_TASK_TEMPLATE_ID && tasksAvailable) {
    return "task";
  }
  return "custom";
}
