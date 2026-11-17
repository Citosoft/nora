import type { WorkspaceDiscoveryResult } from "@shared/types/workspaceImport.types";

export type WorkspaceDiscoveryState =
  | { kind: "loading" }
  | { kind: "failed"; message: string }
  | { kind: "ready"; result: WorkspaceDiscoveryResult };

export interface WorkspaceImportFailure {
  path: string;
  message: string;
}

export interface WorkspaceImportState {
  discovery: WorkspaceDiscoveryState;
  selected: string[];
  imported: string[];
  failures: WorkspaceImportFailure[];
  isImporting: boolean;
  discover: () => Promise<void>;
  importSelected: () => Promise<void>;
  selectAll: () => void;
  clearSelection: () => void;
  toggle: (path: string) => void;
}

export interface WorkspaceImportStepProps {
  state: WorkspaceImportState;
}

export interface WorkspaceImportDeps {
  openProject: (path: string) => Promise<{ errorMessage: string | null }>;
  onImported: (path: string) => void;
}
