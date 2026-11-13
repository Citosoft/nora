import type {
  ProjectScaffoldWizardStep,
  ProjectScaffoldFrameworkCategory,
} from "@/components/app/types/projectScaffoldWizard.types";

export const SCAFFOLD_STEPS: ProjectScaffoldWizardStep[] = [
  "framework",
  "components",
  "testing",
  "agent",
];
export const SCAFFOLD_STEP_COPY: Record<
  ProjectScaffoldWizardStep,
  { title: string; description: string }
> = {
  framework: {
    title: "Choose a framework",
    description: "Pick the project family the agent should scaffold.",
  },
  components: {
    title: "Choose components",
    description: "Select framework-specific libraries and setup choices.",
  },
  testing: {
    title: "Choose test tooling",
    description:
      "Add the test and quality tools this project should start with.",
  },
  agent: {
    title: "Choose an agent",
    description:
      "Review the generated scaffold request and send it to an available agent.",
  },
};
export const FRAMEWORK_CATEGORY_OPTIONS: Array<{
  id: ProjectScaffoldFrameworkCategory | "all";
  label: string;
}> = [
  { id: "all", label: "All" },
  { id: "web", label: "Web" },
  { id: "backend", label: "Backend" },
  { id: "mobile", label: "Mobile" },
  { id: "desktop", label: "Desktop" },
  { id: "data", label: "Data" },
  { id: "cli", label: "CLI" },
  { id: "game", label: "Game" },
  { id: "monorepo", label: "Monorepo" },
];
