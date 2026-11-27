import type { CreateTerminalPayload, WorkspaceSetupScript } from "@shared/appTypes";

export function createEmptyWorkspaceSetupScript(createId: () => string): WorkspaceSetupScript {
  return { id: createId(), name: "", command: "", trigger: "worktree-create", origin: { kind: "user" } };
}

/** Prefills the new-terminal dialog so a setup script can be run by hand in the worktree of the user's choosing. */
export function createSetupScriptTerminalDefaults(
  script: Pick<WorkspaceSetupScript, "name" | "command">,
  shellId: string
): Pick<CreateTerminalPayload, "name" | "shellId" | "launchConfig"> {
  return {
    name: script.name,
    shellId,
    launchConfig: { kind: "script", label: script.name, command: script.command }
  };
}

export function hasIncompleteSetupScripts(scripts: readonly WorkspaceSetupScript[]): boolean {
  return scripts.some((script) => !script.command.trim());
}
