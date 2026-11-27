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

/**
 * History a new conversation adopts instead of producing it through its own runs: a verified native
 * session (resumable) or a transcript supplied by an importer (read-only, never resumed).
 */
export interface ImportedHistory {
  /** Native session the conversation continues; null when the history can't be resumed. */
  nativeConversationId: string | null;
  origin?: ExternalSession["origin"];
  title: string;
  createdAt: string;
  updatedAt: string;
  turns: ExternalTurn[];
}

/** Supplied history has no native session behind it. */
export type SuppliedHistory = ImportedHistory & { nativeConversationId: null };
