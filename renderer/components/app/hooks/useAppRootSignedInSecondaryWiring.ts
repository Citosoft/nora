import { getActiveWorktree } from "@/components/app/logic/appUtils";
import { formatShortcutKeys, SHORTCUT_DEFINITIONS } from "@/components/app/logic/keyboardShortcuts";
import { setDefaultTerminalShell } from "@/components/app/logic/terminalShellPreferences";
import type {
  UseAppRootSignedInSecondaryWiringArgs,
  UseAppRootSignedInSecondaryWiringResult
} from "@/components/app/types/useAppRootSignedInSecondaryWiring.types";
import { useWorkspaceAggregates } from "@/components/app/hooks/useWorkspaceAggregates";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { useMemo } from "react";

export const useAppRootSignedInSecondaryWiring = ({
  uiStateDestroyAgentId,
  focusedAgent,
  focusedTerminal,
  isRemoteMountedWorkspace,
  workspaceTasks,
  workspaceSpecs,
  workspaceNotes,
  workspaceFileTreePaths,
  windowPlatform,
  setDefaultTerminalShellId,
  installedIdes,
  defaultIdeId,
  safely,
  captureError,
  normalizeSnapshot,
  workspaceFileTree
}: UseAppRootSignedInSecondaryWiringArgs): UseAppRootSignedInSecondaryWiringResult => {
  const snapshot = useCanonicalAppSnapshot();
  const activeWorktree = snapshot ? getActiveWorktree(snapshot) : null;
  const activeBranch =
    activeWorktree?.branch || focusedAgent?.branch || focusedTerminal?.branch || snapshot?.project?.baseBranch || "";
  const parentRepoBranch =
    snapshot?.worktrees.find(
      (worktree) => worktree.path === snapshot.project?.rootPath || worktree.createdFromRef === "ROOT"
    )?.branch ||
    snapshot?.project?.baseBranch ||
    snapshot?.projectBranches[0] ||
    "";
  const agentPendingDestroy = snapshot?.agents.find((agent) => agent.id === uiStateDestroyAgentId) ?? null;
  const fileChangeCounts = Object.fromEntries(
    (snapshot?.changes ?? []).map((change) => [
      change.path,
      {
        additions: change.additions,
        deletions: change.deletions
      }
    ])
  );
  const canOpenProjectInIde =
    Boolean(snapshot?.project) &&
    snapshot?.project?.location?.kind !== "ssh" &&
    !isRemoteMountedWorkspace;
  const preferredIde = installedIdes.find((ide) => ide.id === defaultIdeId) ?? installedIdes[0] ?? null;

  const {
    allWorkspaceTasks,
    allWorkspaceSpecs,
    allWorkspaceNotes,
    workspaceQuickSearchSource
  } = useWorkspaceAggregates({
    workspaceTasks,
    workspaceSpecs,
    workspaceNotes,
    workspaceFilePaths: workspaceFileTreePaths
  });

  const workspaceQuickSearchOpenShortcutLabel = useMemo(
    () =>
      formatShortcutKeys(
        SHORTCUT_DEFINITIONS.find((definition) => definition.id === "open-workspace-quick-search")?.keys ?? ["mod", "k"],
        windowPlatform
      ),
    [windowPlatform]
  );

  const handleDefaultTerminalShellChange = (shellId: string | null): void => {
    setDefaultTerminalShell(shellId);
    setDefaultTerminalShellId(shellId);
  };

  const workspaceRuntimeValue = useMemo((): import("@/components/app/types/workspaceRuntime.types").WorkspaceRuntimeValue | null => {
    if (!snapshot) {
      return null;
    }

    return {
      safely,
      captureError,
      normalizeSnapshot,
      workspaceFileTree,
      fileChangeCounts
    };
  }, [snapshot, safely, captureError, normalizeSnapshot, workspaceFileTree, fileChangeCounts]);

  return {
    activeWorktree,
    activeBranch,
    parentRepoBranch,
    agentPendingDestroy,
    fileChangeCounts,
    canOpenProjectInIde,
    preferredIde,
    allWorkspaceTasks,
    allWorkspaceSpecs,
    allWorkspaceNotes,
    workspaceQuickSearchSource,
    workspaceQuickSearchOpenShortcutLabel,
    handleDefaultTerminalShellChange,
    workspaceRuntimeValue
  };
};
