import type { Conversation } from "@shared/types/conversation/contracts.types";
import type { ConnectorAccess, ConnectorAudience, ConnectorSubject } from "@shared/types/connectors/connectors.types";

/** The default: every workspace and every thread, which is how connectors behaved before access could be limited. */
export const CONNECTOR_ACCESS_ALL: ConnectorAccess = { workspaces: { kind: "all" }, bots: { kind: "all" } };

const admits = (audience: ConnectorAudience, id: string | null): boolean => audience.kind === "all" || (id !== null && audience.ids.includes(id));

/** Whether a thread gets a connector. Main uses this to build each turn's servers and the window to show what a thread gets. */
export function connectorAvailableTo(access: ConnectorAccess, subject: ConnectorSubject): boolean {
  return admits(access.workspaces, subject.workspaceId) && admits(access.bots, subject.botId);
}

export function connectorSubjectOf(conversation: Pick<Conversation, "workspace" | "bot">): ConnectorSubject {
  return { workspaceId: conversation.workspace.projectId, botId: conversation.bot?.botId ?? null };
}
