import type { AppImportThread, AppImportTranscriptMessage } from "@shared/types/app-import/appImportPlan.types";
import type { ExternalTurn, SuppliedHistory } from "@main/types/execution/externalSessions.types";
import { appImportIdentity } from "./identity";

const EARLIER_MESSAGES = "Earlier messages";

function isoTime(value: string, fallback: string): string {
  const time = new Date(value);
  return Number.isNaN(time.getTime()) ? fallback : time.toISOString();
}

/**
 * Builds read-only history from a source app's stored messages: each user message opens a turn and the
 * replies that follow belong to it. Replies before any user message get a placeholder turn.
 */
export function transcriptHistory(thread: AppImportThread): SuppliedHistory {
  const createdAt = isoTime(thread.createdAt, new Date(0).toISOString());
  const updatedAt = isoTime(thread.updatedAt, createdAt);
  const messages: AppImportTranscriptMessage[] = (thread.transcript?.messages ?? []).filter((message) => message.text.trim().length > 0);
  const turns: ExternalTurn[] = [];
  messages.forEach((message, index) => {
    const turnId = appImportIdentity(thread.importKey, "turn", String(index));
    if (message.role === "user" || turns.length === 0) {
      turns.push({ id: turnId, instruction: message.role === "user" ? message.text : EARLIER_MESSAGES, state: "completed", items: [] });
    }
    const turn = turns[turns.length - 1];
    if (!turn) return;
    turn.items.push({ id: appImportIdentity(thread.importKey, "message", String(index)), runId: turn.id, createdAt: isoTime(message.createdAt, createdAt),
      kind: "message", role: message.role, text: message.text, complete: true });
  });
  return { nativeConversationId: null, title: thread.title, createdAt, updatedAt, turns };
}
