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
}
export interface PersonalizationSettings {
  read(): AppSettings;
  update(change: (current: AppSettings) => AppSettings): Promise<AppSettings>;
}
