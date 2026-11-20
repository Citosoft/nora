import { useEffect, useRef } from "react";
import { directWorkspaceToFollow } from "@/components/app/logic/directChats";
import type { Conversation } from "@shared/types/conversation/contracts.types";
import type { NativeWorkspace } from "@shared/types/personalization/workspaces.types";
import type { NativeConversationPorts } from "@/components/app/types/nativePanels.types";

/**
 * Points a global bot's chat at the workspace it is open in, each time that changes; a workspace picked in the chat
 * afterwards holds until you open the chat from another workspace.
 */
export function useDirectChatFollowsWorkspace(conversation: Pick<Conversation, "id" | "direct"> | null, openWorkspaceId: string,
  available: readonly Pick<NativeWorkspace, "id">[], execute: NativeConversationPorts["execute"]): void {
  const followed = useRef<string | null>(null);
  const conversationId = conversation?.id ?? null;
  const direct = conversation?.direct;
  useEffect(() => {
    if (!conversationId || !direct) return;
    const key = `${conversationId}:${openWorkspaceId}`;
    if (followed.current === key) return;
    followed.current = key;
    const workspaceId = directWorkspaceToFollow(direct, openWorkspaceId, available);
    if (workspaceId) void execute({ kind: "set-direct-workspace", commandId: crypto.randomUUID(), conversationId, workspaceId });
  }, [conversationId, direct, openWorkspaceId, available, execute]);
}
