import type { CreateTerminalDialogDefaults } from "@/components/app/types";
import type { WorkspaceScriptLauncher, WorkspaceSummary } from "@shared/appTypes";

export function getPreferredWorkspaceScripts(
  workspace: WorkspaceSummary | null,
  fallbackScripts: WorkspaceScriptLauncher[] = []
): WorkspaceScriptLauncher[] {
  if (!workspace) {
    return fallbackScripts;
  }

  const focusedWorktreeIds = new Set(
    workspace.sessions
      .map((session) => session.focusedWorktreeId)
      .filter((worktreeId): worktreeId is string => !!worktreeId)
  );
  const worktree =
    workspace.worktrees.find((entry) => focusedWorktreeIds.has(entry.id) && entry.scripts.length > 0) ||
    workspace.worktrees.find((entry) => entry.scripts.length > 0) ||
    workspace.worktrees.find((entry) => focusedWorktreeIds.has(entry.id)) ||
    workspace.worktrees[0];
  return worktree?.scripts?.length ? worktree.scripts : fallbackScripts;
}

export function formatWorkspaceScriptActionLabel(script: WorkspaceScriptLauncher): string {
  return `run ${script.scriptName}`;
}

export function createScriptTerminalDefaults(script: WorkspaceScriptLauncher, shellId: string): CreateTerminalDialogDefaults {
  const label = formatWorkspaceScriptActionLabel(script);
  return {
    name: label,
    shellId,
    launchConfig: {
      kind: "script",
      label,
      command: script.command,
      scriptName: script.scriptName,
      packageManager: script.packageManager
    }
  };
}
