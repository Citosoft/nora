import { useEffect, useState } from "react";
import { useOptionalWorkspaceSidebarPorts } from "@/components/app/context/workspaceSidebarPortsContext";
import { useThreadRead } from "./useThreadRead";
import type { NativeWorkspace } from "@shared/types/personalization/workspaces.types";
import type { HomeBranchState } from "@/components/app/types/workspace-home/branch.types";

const REFRESH_MS = 30_000;

/** The checkout's change request and local changes, re-read on window focus and every half minute so outside edits show up. */
export function useWorkspaceHomeBranch(workspace: NativeWorkspace): HomeBranchState {
  const forge = useOptionalWorkspaceSidebarPorts()?.threadForge ?? null;
  const projectId = workspace.shellProjectId;
  const branch = workspace.kind === "repository" ? workspace.workspace.branch : null;
  const path = workspace.workspace.path;
  const readable = !!forge && !!projectId && !!branch && workspace.workspace.versionControl !== "none";
  const identity = readable ? JSON.stringify([projectId, branch, path]) : "";
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!identity) return;
    const bump = () => setRevision((current) => current + 1);
    const timer = window.setInterval(bump, REFRESH_MS);
    window.addEventListener("focus", bump);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", bump); };
  }, [identity]);
  const request = useThreadRead(readable && forge && projectId && branch ? () => forge.readBranchRequest(projectId, branch) : null,
    identity, String(revision), "Change request could not be loaded.");
  const changes = useThreadRead(readable && forge && projectId ? () => forge.readBranchChanges(projectId, path) : null,
    identity, String(revision), "Branch changes could not be loaded.");
  return { request, changes };
}
