import type {
  ProjectScaffoldFramework,
  ProjectScaffoldOption,
  ProjectScaffoldPromptInput
} from "@/components/app/types/projectScaffoldWizard.types";

function formatOptionList(options: ProjectScaffoldOption[]): string {
  if (!options.length) {
    return "- None selected";
  }

  return options.map((option) => `- ${option.label}: ${option.description}`).join("\n");
}

export function resolveProjectScaffoldOptions(
  framework: ProjectScaffoldFramework,
  optionIds: string[],
  optionKind: "componentOptions" | "testingOptions"
): ProjectScaffoldOption[] {
  const idSet = new Set(optionIds);
  return framework[optionKind].filter((option) => idSet.has(option.id));
}

export function buildProjectScaffoldPrompt(input: ProjectScaffoldPromptInput): string {
  const starterCommandText = input.framework.starterCommand
    ? `Use this starter command when it is appropriate: ${input.framework.starterCommand}.`
    : "Choose the idiomatic starter commands and file layout for this framework.";

  return [
    `Scaffold a new ${input.framework.label} project.`,
    "",
    `Framework: ${input.framework.label}`,
    `Language/runtime: ${input.framework.language}`,
    `Framework intent: ${input.framework.description}`,
    starterCommandText,
    "",
    "Selected components and libraries:",
    formatOptionList(input.components),
    "",
    "Selected testing and quality tools:",
    formatOptionList(input.testing),
    "",
    "Create the project in this workspace. Prefer current stable framework conventions, keep the setup minimal but complete, add clear scripts or commands for running tests, and summarize the files and commands you created when finished."
  ].join("\n");
}
