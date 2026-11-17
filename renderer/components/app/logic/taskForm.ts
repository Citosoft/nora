import type { TaskFormValues } from "@/components/app/types/taskCreation.types";

export function buildTaskContent(values: TaskFormValues): string {
  const title = values.title.replace(/\s+/g, " ").trim();
  if (!title) {
    throw new Error("Enter a task title.");
  }

  return [
    `# ${title}`,
    "",
    "## Goal",
    "",
    values.goal.trim(),
    "",
    "## Context",
    "",
    values.context.trim(),
    "",
    "## Definition of done",
    "",
    values.definitionOfDone.trim(),
    ""
  ].join("\n");
}
