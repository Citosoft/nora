import type { ExternalSession } from "@shared/types/conversation/externalSessions.types";
import type { ConversationRun, TimelineItem, WorkspaceRef } from "@shared/types/conversation/contracts.types";

export interface ExternalTranscript {
  session: ExternalSession;
  turns: ExternalTurn[];
}
export interface ExternalTurn {
  id: string;
  instruction: string;
  state: Extract<ConversationRun["state"], "completed" | "failed" | "interrupted">;
  items: TimelineItem[];
}
export interface ExternalSessionReader {
  list(workspace: WorkspaceRef): Promise<ExternalSession[]>;
  read(workspace: WorkspaceRef, sessionId: string): Promise<ExternalTranscript>;
}

export type ClaudeHistoryApi = Pick<typeof import("@anthropic-ai/claude-agent-sdk"), "listSessions" | "getSessionInfo" | "getSessionMessages">;

export interface CodexSessionSource { source?: string; originator?: string | null; path?: string | null; }
