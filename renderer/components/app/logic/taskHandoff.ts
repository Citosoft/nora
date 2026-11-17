import { taskIdFromPath } from "@shared/taskIdentity";
import { NORA_SKILL_NAME } from "@shared/skills/bundled";

export function formatTaskHandoffInstruction(taskPath: string): string {
  return `Use the ${NORA_SKILL_NAME} skill to work on task ${JSON.stringify(taskIdFromPath(taskPath))}.`;
}
