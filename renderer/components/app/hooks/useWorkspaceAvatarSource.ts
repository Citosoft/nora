import { useCallback, useContext, useEffect, useSyncExternalStore } from "react";
import { NativeRuntimeContext } from "@/components/app/context/nativeRuntimeContext";
import { workspaceLogoStore } from "@/components/app/logic/workspace-navigation/logoStore";
import type { WorkspaceAvatarSource } from "@/components/app/types/workspaceAvatar.types";

/**
 * Avatar identities carry either a native workspace id or a shell project id, so both are matched.
 * Logos are looked up by shell project id; an id with no native entry is tried as one directly.
 */
export function useWorkspaceAvatarSource(workspaceId: string): WorkspaceAvatarSource {
  const runtime = useContext(NativeRuntimeContext);
  const entry = runtime?.boot.workspaces.find((workspace) => workspace.id === workspaceId || workspace.shellProjectId === workspaceId);
  const personal = entry?.kind === "personal";
  const projectId = personal ? null : entry ? entry.shellProjectId ?? null : workspaceId;
  useEffect(() => { if (projectId) workspaceLogoStore.request(projectId); }, [projectId]);
  const getLogo = useCallback(() => projectId ? workspaceLogoStore.get(projectId) ?? null : null, [projectId]);
  const logo = useSyncExternalStore(workspaceLogoStore.subscribe, getLogo);
  if (personal) return { kind: "personal" };
  return logo ? { kind: "logo", dataUrl: logo } : { kind: "initials" };
}
