import { useMemo } from "react";
import { effectiveBots } from "@shared/bots/catalog";
import { applyWorkThreadVisibility, buildThreadNavigation } from "@/components/app/logic/thread-workspace/navigation";
import { useWorkThreadVisibility } from "./useWorkThreadVisibility";
import type { ThreadWorkspaceSnapshot } from "@/components/app/types/thread-workspace/state.types";
import type { WorkspaceBotRoster } from "@/components/app/types/botNavigation.types";

/** The bots available in a workspace (global ones only without one) and its rows, so the sidebar, Bots home and info panel agree. */
export function useWorkspaceBotRoster(state: ThreadWorkspaceSnapshot, workspaceId: string | null): WorkspaceBotRoster {
  const { personalization, sharedBots } = state.boot;
  const bots = useMemo(() => effectiveBots(personalization.bots, workspaceId, sharedBots), [personalization.bots, workspaceId, sharedBots]);
  const { visibility } = useWorkThreadVisibility();
  const rows = useMemo(() => workspaceId ? applyWorkThreadVisibility(buildThreadNavigation(state, workspaceId, "all"), visibility) : [],
    [state, workspaceId, visibility]);
  return { bots, rows };
}
