export function deriveTaskTitle(content: string, fallbackTitle: string): string {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.startsWith("# "))
    ?.replace(/^#\s+/, "")
    .trim() || fallbackTitle;
}

export function createTaskDraft(title: string): string {
  return [
    `# ${title}`,
    "",
    "## Goal",
    "",
    "- Describe the desired outcome.",
    "",
    "## Context",
    "",
    "- Add relevant links, files, or constraints.",
    "",
    "## Definition of done",
    "",
    "- Explain what success looks like."
  ].join("\n");
}

export function createDuplicatedTaskContent(title: string, sourceContent: string): string {
  const trimmedSource = sourceContent.trim();
  return trimmedSource.startsWith("# ")
    ? trimmedSource.replace(/^#\s+.*/m, `# ${title}`)
    : `# ${title}\n\n${trimmedSource}`;
}

export function createTaskPlanningInstruction(options: {
  projectName: string;
  projectRootPath: string;
  brief?: string | null;
  specPath?: string | null;
}): string {
  return [
    `Use plan mode to break down the following work for ${options.projectName}:`,
    "",
    options.specPath
      ? `Use the spec at \`${options.specPath}\` as the source of truth for the planning requirements.`
      : (options.brief || "").trim(),
    "",
    "After you finish planning, create one Markdown task file per identified task under `.nora/tasks/` in this workspace.",
    "Use filenames that describe the task briefly and keep them unique.",
    "Write each task file in this exact format:",
    "",
    "# Task title",
    "",
    "## Goal",
    "",
    "- Describe the desired outcome.",
    "",
    "## Context",
    "",
    "- Add relevant links, files, or constraints.",
    "",
    "## Definition of done",
    "",
    "- Explain what success looks like.",
    "",
    "Only create task files that are genuinely actionable. Do not edit unrelated files.",
    `The workspace root is: ${options.projectRootPath}`
  ].join("\n");
}
