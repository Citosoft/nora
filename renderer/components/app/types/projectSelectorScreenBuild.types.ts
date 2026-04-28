import type { ProjectSelectorScreenProps } from "@/components/app/types/workflow.types";
import type { AppState } from "@shared/appTypes";

export type ProjectSelectorScreenBuildDeps = {
  installCommandDrafts: ProjectSelectorScreenProps["installCommandDrafts"];
  openAddWorkspaceModal: () => Promise<AppState | null>;
  resolveInstallCommand: (toolId: string, installTemplate: string) => string;
  safely: (action: () => Promise<AppState>) => Promise<AppState | null>;
  setInstallCommandDraft: (toolId: string, value: string) => void;
};
