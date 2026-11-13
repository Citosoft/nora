import { useMemo } from "react";
import { effectiveBots, knownBotIds } from "@shared/bots/catalog";
import { templatesForRole } from "@shared/bots/templates";
import { effectiveRole, roleProfile } from "@shared/personalization/profiles";
import { useThreadCenterPorts } from "./useThreadCenterPorts";
import { applyMemberThreadVisibility, buildThreadNavigation } from "@/components/app/logic/thread-workspace/navigation";
import { useMemberThreadVisibility } from "./useMemberThreadVisibility";
import { buildBotNavigation } from "@/components/app/logic/botNavigation";
import type { BotsHomeState } from "@/components/app/types/botNavigation.types";

/** Bots home for the focused workspace, built from the same grouping as Bots mode in the sidebar. */
export function useBotsHome(): BotsHomeState {
  const { state, store } = useThreadCenterPorts();
  const workspaceId = state.layout.focusedWorkspaceId;
  const workspace = state.boot.workspaces.find((entry) => entry.id === workspaceId) ?? null;
  const { personalization, sharedBots } = state.boot;
  const bots = useMemo(() => effectiveBots(personalization.bots, workspace?.id ?? null, sharedBots), [personalization.bots, workspace, sharedBots]);
  const { visibility: memberThreads } = useMemberThreadVisibility();
  const rows = useMemo(() => workspace ? applyMemberThreadVisibility(buildThreadNavigation(state, workspace.id, "all"), memberThreads) : [],
    [state, workspace, memberThreads]);
  const items = useMemo(() => buildBotNavigation(bots, rows, "", workspace?.name ?? null).flatMap((group) => group.items), [bots, rows, workspace]);
  const groupThreads = useMemo(() => rows.filter((row) => row.group).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [rows]);
  const role = workspace ? effectiveRole(personalization, workspace.id) : personalization.defaultRole;
  const templates = useMemo(() => templatesForRole(role), [role]);
  const templateRole = role && templates.suggested.length ? role.id === "custom" ? "your role" : roleProfile(role).label : null;
  const takenIds = useMemo(() => knownBotIds(personalization.bots, workspace?.id ?? null, sharedBots), [personalization.bots, workspace, sharedBots]);
  return { workspace, items, groupThreads, bots, takenIds, templates, templateRole,
    startThread: (botId) => { if (workspace) store.openDraft({ workspaceId: workspace.id, ...(botId ? { botId } : {}) }); },
    startGroup: (group) => { if (workspace) store.openDraft({ workspaceId: workspace.id, group }); },
    togglePin: (row) => { if (row.target.kind === "thread") store.togglePin(row.target.conversationId); },
    openThread: (row) => { if (row.target.kind === "draft") store.focusDocument(row.target.documentId); else store.openThread(row.target.conversationId); } };
}
