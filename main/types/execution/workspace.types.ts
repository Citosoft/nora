import type { WorkspaceRef } from "@shared/types/conversation/contracts.types";

export interface WorkspaceAuthority {
  prepare(selection: WorkspaceRef): Promise<WorkspaceRef>;
  verify(workspace: WorkspaceRef): Promise<void>;
}
export interface WorkspaceRegistration { projectId: string; checkoutId: string; path: string }
export interface CheckoutInspection { rootPath: string; branch: string }
export interface LocalWorkspaceOptions {
  environmentId: string;
  registrations: () => readonly WorkspaceRegistration[];
  inspectCheckout: (path: string) => Promise<CheckoutInspection>;
}
