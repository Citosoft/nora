export type WorkspaceImportSource = "claude" | "codex";

export interface DiscoveredWorkspace {
  path: string;
  name: string;
  sources: WorkspaceImportSource[];
}

export interface WorkspaceDiscoveryResult {
  workspaces: DiscoveredWorkspace[];
  warnings: string[];
}
