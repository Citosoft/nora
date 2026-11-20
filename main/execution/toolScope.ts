import type { Conversation } from "@shared/types/conversation/contracts.types";
import type { ThreadToolScope } from "@main/types/execution/toolScope.types";

/** Read access always wins, so a review stays a review; an app's builder thread then gets only app tools and its connectors. */
export function threadToolScope(conversation: Pick<Conversation, "workspace" | "source">): ThreadToolScope {
  if (conversation.workspace.access === "read") return conversation.source?.kind === "worker" ? "read-worker" : "inspect";
  if (conversation.source?.kind === "app") return "apps";
  return "full";
}

export function isReadOnlyToolScope(scope: ThreadToolScope): boolean {
  return scope === "inspect" || scope === "read-worker";
}
