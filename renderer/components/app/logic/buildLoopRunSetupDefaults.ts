import { LOOP_RUN_GOAL_TEMPLATES } from "@/components/app/constants/loopRunGoalTemplates";
import { applyLoopRunGoalTemplate } from "@/components/app/logic/applyLoopRunGoalTemplate";
import { LOOP_RUN_TASK_TEMPLATE_ID } from "@/components/app/logic/loopRunGoalTemplateUi";
import type { LoopRunSetupDefaults, WorkflowRunTask } from "@/components/app/types/workflowLaunch.types";
import type { LoopDefinition } from "@shared/appTypes";
import { loopLimitsToDraft } from "@shared/loopLimits";

/** A run launched from a task starts on the Complete task template with that task selected, on a branch named after it. */
export function buildLoopRunSetupDefaults(definition: LoopDefinition, task: WorkflowRunTask | null): LoopRunSetupDefaults {
  const limitsDraft = loopLimitsToDraft(definition.limits);
  const blank: LoopRunSetupDefaults = { templateId: "", goalKind: "custom", selectedTaskPath: "", objective: "", limitsDraft, branchName: definition.name };
  if (!task) return blank;
  const template = LOOP_RUN_GOAL_TEMPLATES.find((entry) => entry.id === LOOP_RUN_TASK_TEMPLATE_ID);
  const applied = template
    ? applyLoopRunGoalTemplate({ template, specsAvailable: false, tasksAvailable: true, selectedSpecPath: "", selectedTaskPath: task.path,
        firstSpecPath: "", firstTaskPath: task.path, limitsDraft })
    : { objective: "", limitsDraft };
  return { templateId: LOOP_RUN_TASK_TEMPLATE_ID, goalKind: "task", selectedTaskPath: task.path,
    objective: applied.objective, limitsDraft: applied.limitsDraft, branchName: task.title.trim() || definition.name };
}
