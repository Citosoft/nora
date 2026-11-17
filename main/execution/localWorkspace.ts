import { realpath, stat } from "node:fs/promises";
import { isAbsolute } from "node:path";
import type { WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { LocalWorkspaceOptions, WorkspaceAuthority } from "@main/types/execution/workspace.types";
import { ExecutionCommandError } from "./errors";
import { checkoutIdentity } from "./checkoutIdentity";

/** Runs on the filesystem owner. Remote selections must be routed to their remote authority. */
export class LocalWorkspaceAuthority implements WorkspaceAuthority {
  constructor(private readonly options: LocalWorkspaceOptions) {}

  async prepare(selection: WorkspaceRef): Promise<WorkspaceRef> {
    this.assertEnvironment(selection);
    const matches = this.options.registrations().filter((entry) => entry.projectId === selection.projectId && entry.checkoutId === selection.checkoutId);
    if (matches.length !== 1) throw new ExecutionCommandError("missing", "Select a registered checkout on this execution host");
    // Caller path/branch/identity are display hints, never authority to access another folder.
    return this.resolve({ ...selection, path: matches[0].path });
  }

  async verify(workspace: WorkspaceRef): Promise<void> {
    this.assertEnvironment(workspace);
    const current = await this.resolve(workspace);
    if (current.checkoutId !== workspace.checkoutId || current.branch !== workspace.branch || current.path !== workspace.path
      || (workspace.versionControl !== undefined && current.versionControl !== workspace.versionControl)) {
      throw new ExecutionCommandError("conflict", "Workspace identity or branch changed; review the checkout before continuing");
    }
  }

  private assertEnvironment(workspace: WorkspaceRef): void {
    if (workspace.environmentId !== this.options.environmentId) throw new ExecutionCommandError("environment", "Workspace belongs to a different execution host");
  }
  private async resolve(workspace: WorkspaceRef): Promise<WorkspaceRef> {
    if (!isAbsolute(workspace.path)) throw new ExecutionCommandError("invalid", "Registered checkout paths must be absolute");
    try {
      const selected = await realpath(workspace.path);
      const inspection = await this.options.inspectCheckout(selected);
      const root = await realpath(inspection.rootPath);
      const info = await stat(root, { bigint: true });
      if (!info.isDirectory()) throw new Error("Checkout is not a directory");
      // File identity detects replacement at the same path; realpath merges symlink aliases.
      const checkoutId = checkoutIdentity(workspace.environmentId, root, info);
      return { ...workspace, path: root, branch: inspection.branch, checkoutId,
        ...(inspection.versionControl ? { versionControl: inspection.versionControl } : {}) };
    } catch (error) {
      if (error instanceof ExecutionCommandError) throw error;
      throw new ExecutionCommandError("invalid", "The registered checkout could not be inspected on its execution host");
    }
  }
}
