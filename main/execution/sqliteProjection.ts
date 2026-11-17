import type { DatabaseSync } from "node:sqlite";
import type { ConversationEvent } from "@shared/types/conversation/contracts.types";

/** Apply validated journal events without rewriting unrelated messages or turns. */
export function projectSqliteEvent(database: DatabaseSync, event: ConversationEvent): void {
  const { conversationId, cursor, payload } = event;
  switch (payload.kind) {
    case "conversation": {
      const { conversation } = payload;
      database.prepare(`INSERT INTO conversation_heads(id, cursor, project_id, checkout_id, access, json) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET cursor = excluded.cursor, project_id = excluded.project_id,
          checkout_id = excluded.checkout_id, access = excluded.access, json = excluded.json`)
        .run(conversationId, cursor, conversation.workspace.projectId, conversation.workspace.checkoutId,
          conversation.workspace.access, JSON.stringify(conversation));
      return;
    }
    case "run":
      database.prepare(`INSERT INTO conversation_runs(conversation_id, id, state, json) VALUES (?, ?, ?, ?)
        ON CONFLICT(conversation_id, id) DO UPDATE SET state = excluded.state, json = excluded.json`)
        .run(conversationId, payload.run.id, payload.run.state, JSON.stringify(payload.run));
      break;
    case "remove-run":
      database.prepare("DELETE FROM conversation_runs WHERE conversation_id = ? AND id = ?").run(conversationId, payload.runId);
      break;
    case "item":
      database.prepare(`INSERT INTO conversation_items(conversation_id, id, run_id, json) VALUES (?, ?, ?, ?)
        ON CONFLICT(conversation_id, id) DO UPDATE SET json = excluded.json`)
        .run(conversationId, payload.item.id, payload.item.runId, JSON.stringify(payload.item));
      break;
    case "request":
      database.prepare(`INSERT INTO conversation_requests(conversation_id, id, run_id, status, json) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(conversation_id, id) DO UPDATE SET status = excluded.status, json = excluded.json`)
        .run(conversationId, payload.request.id, payload.request.runId, payload.request.status, JSON.stringify(payload.request));
      break;
  }
  const result = database.prepare("UPDATE conversation_heads SET cursor = ? WHERE id = ?").run(cursor, conversationId);
  if (result.changes !== 1) throw new Error("Conversation must exist before its activity");
}
