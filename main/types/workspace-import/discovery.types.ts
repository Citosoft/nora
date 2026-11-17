import type { WorkspaceImportSource } from "@shared/types/workspaceImport.types";

export interface WorkspaceHistorySource {
  id: WorkspaceImportSource;
  listPaths: () => Promise<string[]>;
}
