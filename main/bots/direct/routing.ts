import type { DirectRoute, DirectRoutingInput } from "@main/types/bots/chats.types";

const TITLE_MAX = 60;

/** A short task title from the message when the router gave none. */
export function taskTitle(message: string): string {
  const line = message.trim().split("\n")[0]?.trim() ?? "";
  return line.length > TITLE_MAX ? `${line.slice(0, TITLE_MAX - 1).trimEnd()}…` : line || "New task";
}

/**
 * Settles where a direct-chat message goes. A router answer is used only when it names an open thread or an allowed workspace;
 * otherwise the message continues the latest open thread in the chat's working workspace, or starts a new one there.
 */
export function resolveDirectRoute({ route, message, threads, workspaces, defaultWorkspaceId }: DirectRoutingInput): DirectRoute {
  if (route?.kind === "continue" && threads.some((thread) => thread.id === route.threadId)) return route;
  if (route?.kind === "new" && workspaces.some((workspace) => workspace.id === route.workspaceId)) {
    return { kind: "new", workspaceId: route.workspaceId, title: route.title.trim() || taskTitle(message) };
  }
  const latest = threads.filter((thread) => thread.workspaceId === defaultWorkspaceId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  return latest ? { kind: "continue", threadId: latest.id } : { kind: "new", workspaceId: defaultWorkspaceId, title: taskTitle(message) };
}
