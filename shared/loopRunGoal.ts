export interface LoopRunGoal {
  objective: string;
  specPath: string | null;
  taskPath: string | null;
  handoffPath: string | null;
}

export function normalizeLoopRunGoal(input: {
  objective?: string | null;
  specPath?: string | null;
  taskPath?: string | null;
  handoffPath?: string | null;
}): LoopRunGoal {
  const objective = (input.objective ?? "").trim();
  const specPath = (input.specPath ?? "").trim() || null;
  const taskPath = (input.taskPath ?? "").trim() || null;
  const handoffPath = (input.handoffPath ?? "").trim() || null;
  const attachmentPaths = [specPath, taskPath, handoffPath].filter(Boolean);
  if (attachmentPaths.length > 1) {
    throw new Error("Choose only one attached workflow goal file.");
  }
  if (!objective && attachmentPaths.length === 0) {
    throw new Error("Workflow run goal is required.");
  }
  return { objective, specPath, taskPath, handoffPath };
}

export function hasLoopRunGoal(input: {
  objective?: string | null;
  specPath?: string | null;
  taskPath?: string | null;
  handoffPath?: string | null;
}): boolean {
  return !!(
    input.objective?.trim()
    || input.specPath?.trim()
    || input.taskPath?.trim()
    || input.handoffPath?.trim()
  );
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
  } else if (goal.handoffPath) {
    sections.push(
      `Review feedback handoff (source of truth):\n\`${goal.handoffPath}\``,
      "Read the attached handoff file and address every selected review comment. Inspect surrounding code before editing and validate the result before completing the run."
    );
  }
  if (goal.objective) {
    sections.push(
      goal.specPath || goal.taskPath || goal.handoffPath
        ? `Additional instructions:\n${goal.objective}`
        : `Objective:\n${goal.objective}`
    );
  }
  return sections.join("\n\n");
}

export function resolveLoopRunGoalAttachmentPath(goal: LoopRunGoal): string | null {
  return goal.specPath ?? goal.taskPath ?? goal.handoffPath;
}
