export interface LoopRunGoal {
  objective: string;
  specPath: string | null;
  taskPath: string | null;
}

export function normalizeLoopRunGoal(input: {
  objective?: string | null;
  specPath?: string | null;
  taskPath?: string | null;
}): LoopRunGoal {
  const objective = (input.objective ?? "").trim();
  const specPath = (input.specPath ?? "").trim() || null;
  const taskPath = (input.taskPath ?? "").trim() || null;
  if (specPath && taskPath) {
    throw new Error("Choose either a spec or a task as the workflow goal, not both.");
  }
  if (!objective && !specPath && !taskPath) {
    throw new Error("Workflow run goal is required.");
  }
  return { objective, specPath, taskPath };
}

export function hasLoopRunGoal(input: {
  objective?: string | null;
  specPath?: string | null;
  taskPath?: string | null;
}): boolean {
  return !!(input.objective?.trim() || input.specPath?.trim() || input.taskPath?.trim());
}

export function buildLoopRunGoalPromptSection(goal: LoopRunGoal): string {
  const sections: string[] = [];
  if (goal.specPath) {
    sections.push(
      `Spec (source of truth):\n\`${goal.specPath}\``,
      "Treat the attached spec as the primary goal. Implement and verify against its requirements and definition of done."
    );
  } else if (goal.taskPath) {
    sections.push(
      `Task (source of truth):\n\`${goal.taskPath}\``,
      "Treat the attached task file as the primary goal. Follow its goal, context, and definition of done."
    );
  }
  if (goal.objective) {
    sections.push(
      goal.specPath || goal.taskPath
        ? `Additional instructions:\n${goal.objective}`
        : `Objective:\n${goal.objective}`
    );
  }
  return sections.join("\n\n");
}

export function resolveLoopRunGoalAttachmentPath(goal: LoopRunGoal): string | null {
  return goal.specPath ?? goal.taskPath;
}
