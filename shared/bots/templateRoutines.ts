import { ROUTINE_TEMPLATES } from "./routines/templates";
import { pausedRoutineInputSchema } from "./routines/contracts";
import type { BotDefinition, BotTemplate } from "@shared/types/bots/bots.types";
import type { PausedRoutineInput, RoutineTemplate } from "@shared/types/bots/routines.types";

export function routinesForTemplate(template: BotTemplate): RoutineTemplate[] {
  return template.routineTemplateIds.flatMap((id) => {
    const routine = ROUTINE_TEMPLATES.find((entry) => entry.id === id);
    return routine ? [routine] : [];
  });
}

/** Copy editable tasks and schedules; no routine is enabled merely by choosing a bot template. */
export function routineInputsForTemplate(template: BotTemplate, ids: readonly string[], bot: BotDefinition, workspaceId: string, timezone: string): PausedRoutineInput[] {
  if (new Set(ids).size !== ids.length || ids.some((id) => !template.routineTemplateIds.includes(id))) throw new Error("Choose routines included in this template.");
  if (ids.length && bot.scope.kind === "workspace" && bot.scope.workspaceId !== workspaceId) throw new Error("Choose the bot's own workspace for its routines.");
  return routinesForTemplate(template).filter((routine) => ids.includes(routine.id)).map((routine) => pausedRoutineInputSchema.parse({
    botId: bot.id, name: routine.name, instruction: routine.instruction, schedule: routine.schedule, runIn: routine.runIn,
    workspaceId, timezone, active: false, missedPolicy: "skip"
  }));
}
