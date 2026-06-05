export type ProjectScaffoldWizardStep = "framework" | "components" | "testing" | "agent";

export type ProjectScaffoldOption = {
  id: string;
  label: string;
  description: string;
  recommended?: boolean;
};

export type ProjectScaffoldFrameworkCategory = "web" | "backend" | "mobile" | "desktop" | "data";

export type ProjectScaffoldFramework = {
  id: string;
  label: string;
  language: string;
  category: ProjectScaffoldFrameworkCategory;
  logoUrl: string;
  description: string;
  starterCommand: string | null;
  componentOptions: ProjectScaffoldOption[];
  testingOptions: ProjectScaffoldOption[];
};

export type ProjectScaffoldSelection = {
  frameworkId: string;
  componentIds: string[];
  testingIds: string[];
};

export type ProjectScaffoldPromptInput = {
  framework: ProjectScaffoldFramework;
  components: ProjectScaffoldOption[];
  testing: ProjectScaffoldOption[];
};
