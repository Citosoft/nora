import { BOT_INSTRUCTIONS_MAX, BOT_MEMORY_TEXT_MAX, BOT_NAME_MAX, BOT_ROLE_MAX } from "@shared/bots/contracts";
import { ROUTINE_INSTRUCTION_MAX, ROUTINE_NAME_MAX, ROUTINES_PER_BOT_MAX, routineScheduleSchema } from "@shared/bots/routines/contracts";
import { isValidTimezone, localTimezone, validateRoutineSchedule } from "@shared/bots/routines/schedule";
import type { AppImportBotRoutine, AppImportSkippedItem } from "@shared/types/app-import/appImportPlan.types";
import type { AppImportBotDraft, AppImportBotRoutineDraft, AppImportFittedBot } from "@main/types/app-import/appImportBots.types";

/** Most memory notes a bot brings; Nora loads memory into every turn, so a huge dump would crowd out the work. */
const MEMORY_MAX = 200;

function clip(value: string, max: number): { text: string; clipped: boolean } {
  const text = value.trim();
  return text.length > max ? { text: text.slice(0, max).trimEnd(), clipped: true } : { text, clipped: false };
}

function fitRoutine(draft: AppImportBotRoutineDraft): { routine: AppImportBotRoutine } | { reason: string } {
  if (draft.unsupportedReason) return { reason: draft.unsupportedReason };
  const schedule = routineScheduleSchema.safeParse(draft.schedule);
  if (!schedule.success) return { reason: "Its schedule isn't one Nora can run." };
  const timezone = draft.timezone && isValidTimezone(draft.timezone) ? draft.timezone : null;
  try {
    validateRoutineSchedule(schedule.data, timezone ?? localTimezone());
  } catch (error) {
    return { reason: error instanceof Error ? error.message : "Its schedule isn't one Nora can run." };
  }
  const name = clip(draft.name, ROUTINE_NAME_MAX).text || "Imported routine";
  const instruction = clip(draft.instruction, ROUTINE_INSTRUCTION_MAX).text;
  if (!instruction) return { reason: "It has no instruction to run." };
  return { routine: { name, instruction, schedule: schedule.data, timezone } };
}

/** Fits a source bot to Nora's limits, noting every shortening and listing what can't come along. */
export function fitAppImportBot(draft: AppImportBotDraft): AppImportFittedBot {
  const adjustments: string[] = [];
  const skipped: AppImportSkippedItem[] = [];
  const name = clip(draft.name, BOT_NAME_MAX);
  if (name.clipped) adjustments.push(`Name shortened to ${BOT_NAME_MAX} characters.`);
  const label = name.text || "Imported bot";
  const role = clip(draft.role, BOT_ROLE_MAX);
  if (role.clipped) adjustments.push(`Role shortened to ${BOT_ROLE_MAX} characters.`);
  const instructions = clip(draft.instructions, BOT_INSTRUCTIONS_MAX);
  if (instructions.clipped) adjustments.push(`Instructions shortened to ${BOT_INSTRUCTIONS_MAX.toLocaleString("en-GB")} characters.`);
  const memory: string[] = [];
  let clippedNotes = 0;
  for (const note of draft.memory) {
    const fitted = clip(note, BOT_MEMORY_TEXT_MAX);
    if (!fitted.text || memory.includes(fitted.text)) continue;
    if (fitted.clipped) clippedNotes += 1;
    memory.push(fitted.text);
  }
  if (clippedNotes) adjustments.push(`${clippedNotes} memory ${clippedNotes === 1 ? "note" : "notes"} shortened to ${BOT_MEMORY_TEXT_MAX} characters.`);
  if (memory.length > MEMORY_MAX) {
    skipped.push({ kind: "bot", label: `${label}: ${memory.length - MEMORY_MAX} older memory notes`, reason: `Nora imports up to ${MEMORY_MAX} notes per bot.` });
    memory.length = MEMORY_MAX;
  }
  const routines: AppImportBotRoutine[] = [];
  for (const draftRoutine of draft.routines) {
    const fitted = fitRoutine(draftRoutine);
    if ("reason" in fitted) skipped.push({ kind: "bot", label: `${label}: routine "${draftRoutine.name}"`, reason: fitted.reason });
    else if (routines.length >= ROUTINES_PER_BOT_MAX) skipped.push({ kind: "bot", label: `${label}: routine "${draftRoutine.name}"`, reason: `Nora allows ${ROUTINES_PER_BOT_MAX} routines per bot.` });
    else routines.push(fitted.routine);
  }
  return { bot: { importKey: draft.importKey, name: label, role: role.text, instructions: instructions.text, model: draft.model, avatar: draft.avatar, memory, routines, adjustments }, skipped };
}
