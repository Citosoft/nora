import type { ExecutionProvider } from "@main/types/execution/provider.types";
import type { ExternalTranscript } from "@main/types/execution/externalSessions.types";
import type { ExternalSessionsResult } from "@shared/types/conversation/externalSessions.types";
import type { WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { ConversationSummary } from "@shared/types/conversation/queries.types";
import { externalSessionsResultSchema } from "@shared/conversations/externalSessions";
import { ExecutionCommandError } from "./errors";

export async function discoverExternalSessions(provider: ExecutionProvider, workspace: WorkspaceRef, summaries: () => ConversationSummary[]): Promise<ExternalSessionsResult> {
  if (!provider.externalSessions) return { status: "available", sessions: [] };
  try {
    const sessions = await provider.externalSessions.list(workspace);
    const linked = new Set(summaries().filter(({ conversation }) => conversation.provider.kind === provider.kind
      && conversation.provider.instanceId === provider.instanceId).map(({ conversation }) => conversation.nativeConversationId));
    return externalSessionsResultSchema.parse({ status: "available", sessions: sessions.filter((session) => !linked.has(session.id)) });
  } catch {
    return { status: "unavailable", message: `${provider.kind === "claude" ? "Claude" : "Codex"} external sessions could not be read. Check the runtime and refresh.` };
  }
}

export async function readExternalTranscript(provider: ExecutionProvider, workspace: WorkspaceRef, sessionId: string): Promise<ExternalTranscript> {
  if (!provider.externalSessions) throw new ExecutionCommandError("invalid", "This provider does not support external session imports");
  try {
    const transcript = await provider.externalSessions.read(workspace, sessionId);
    if (transcript.session.id !== sessionId || transcript.session.providerKind !== provider.kind || transcript.session.instanceId !== provider.instanceId) {
      throw new ExecutionCommandError("invalid", "The external conversation does not match the selected provider");
    }
    return transcript;
  } catch (error) {
    if (error instanceof ExecutionCommandError) throw error;
    throw new ExecutionCommandError("unavailable", "The external conversation could not be loaded. Close it in its original app and try again.");
  }
}
