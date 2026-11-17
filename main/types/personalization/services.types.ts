import type { AppSettings } from "@shared/appTypes";
import type { WorkspaceAuthority, WorkspaceRegistration } from "@main/types/execution/workspace.types";
import type { NativeWorkspace } from "@shared/types/personalization/workspaces.types";

export interface WorkspaceCatalogOptions {
  indexPath: string;
  personalPath: string;
  environmentId: string;
  authority: Pick<WorkspaceAuthority, "verify">;
  prepare: WorkspaceAuthority["prepare"];
}
export interface WorkspaceCatalog {
  list(): NativeWorkspace[];
  registrations(): WorkspaceRegistration[];
  ensurePersonal(): Promise<NativeWorkspace>;
  addFolder(path: string, name: string): Promise<NativeWorkspace>;
  bindProject(projectId: string, path: string, name: string): Promise<NativeWorkspace>;
  /**
   * Replaces the extra checkouts registered for a project's workspace with `paths` (its ready worktrees). Paths that can't
   * be inspected are skipped. Resolves whether anything changed.
   */
  setProjectCheckouts(projectId: string, paths: readonly string[]): Promise<boolean>;
}
export interface PersonalizationSettings {
  read(): AppSettings;
  update(change: (current: AppSettings) => AppSettings): Promise<AppSettings>;
}
