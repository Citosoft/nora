import type { WorkspaceRef } from "@shared/types/conversation/contracts.types";

export interface WorkspaceAuthority {
  prepare(selection: WorkspaceRef): Promise<WorkspaceRef>;
  /**
   * The same checkout as it is now. A branch switch inside the checkout is followed (threads move with it);
   * a different, replaced or missing checkout is rejected.
   */
  refresh(workspace: WorkspaceRef): Promise<WorkspaceRef>;
  /** Rejects unless the checkout is unchanged, branch included; guards captures and restores within one turn. */
  verify(workspace: WorkspaceRef): Promise<void>;
}
export interface WorkspaceRegistration { projectId: string; checkoutId: string; path: string }
export interface CheckoutInspection { rootPath: string; branch: string; versionControl?: "git" | "none" }
export interface LocalWorkspaceOptions {
  environmentId: string;
  registrations: () => readonly WorkspaceRegistration[];
  inspectCheckout: (path: string) => Promise<CheckoutInspection>;
}
