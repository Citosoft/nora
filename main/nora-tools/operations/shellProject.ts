import type { NoraToolContext } from "@main/types/nora-tools/noraTools.types";
import type { NoraShellProject, NoraToolOperationOptions } from "@main/types/nora-tools/operations.types";

/**
 * The shell project behind the calling thread's workspace. Task boards and workflows belong to project workspaces;
 * Personal and unbound folders have none, so callers explain that in their own words when this is null.
 */
export function shellProjectOf(options: Pick<NoraToolOperationOptions, "boot">, { conversation }: NoraToolContext): NoraShellProject | null {
  const entry = options.boot().workspaces.find((workspace) => workspace.id === conversation.workspace.projectId);
  return entry?.shellProjectId ? { id: entry.shellProjectId, name: entry.name } : null;
}
