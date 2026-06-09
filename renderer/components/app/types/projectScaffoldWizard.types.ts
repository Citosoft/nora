export type ProjectScaffoldWizardStep = "framework" | "components" | "testing" | "agent";

export type ProjectScaffoldOption = {
  id: string;
  label: string;
  description: string;
  recommended?: boolean;
};

export type ProjectScaffoldComponentCategory =
  | "foundation"
  | "ui"
  | "application"
  | "data"
  | "auth"
  | "platform"
  | "operations"
  | "features";

export type ProjectScaffoldComponentGroup = {
  category: ProjectScaffoldComponentCategory;
  label: string;
  options: ProjectScaffoldOption[];
};

export type ProjectScaffoldFrameworkCategory =
  | "web"
  | "backend"
  | "mobile"
  | "desktop"
  | "data"
  | "cli"
  | "game"
  | "monorepo";

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

export type ProjectScaffoldFavorite = ProjectScaffoldSelection & {
  id: string;
  name: string;
  toolId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SaveProjectScaffoldFavoriteInput = ProjectScaffoldSelection & {
  name: string;
  toolId: string | null;
};

export type ProjectScaffoldPromptInput = {
  framework: ProjectScaffoldFramework;
  components: ProjectScaffoldOption[];
  testing: ProjectScaffoldOption[];
};
