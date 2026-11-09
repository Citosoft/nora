import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { conversationSchema, requestSchema, runSchema, timelineItemSchema } from "@shared/conversations/contracts";
import type { ConversationSnapshot, WorkspaceRef } from "@shared/types/conversation/contracts.types";
import { isPathWithinComparableRoot } from "@shared/pathComparison";
import type { ConversationHeader, ConversationHistoryPage, ConversationSummary, HistoryQuery } from "@shared/types/conversation/queries.types";
import type { ConversationState, ExecutionState } from "@main/types/execution/store.types";
import { activeRunStates, isActiveRun } from "./projection";
import { summarizeConversation } from "./summaries";
import { ExecutionCommandError } from "./errors";

const jsonRowSchema = z.object({ json: z.string() });
const headSchema = z.object({ cursor: z.number().int().nonnegative(), json: z.string() });
const idRowSchema = z.object({ id: z.string() });
const positionRowSchema = z.object({ position: z.number().int().positive(), json: z.string() });
const countRowSchema = z.object({ count: z.number().int().nonnegative() });
// These literals come exclusively from the domain enum, never command or provider input.
const activeSql = activeRunStates.map((state) => `'${state}'`).join(", ");

export function readJsonRow<T>(row: unknown, schema: z.ZodType<T>): T {
  return schema.parse(JSON.parse(jsonRowSchema.parse(row).json));
}

export class SqliteQueries {
  constructor(protected readonly database: DatabaseSync) {}

  /** Full export/debug snapshot. Live engine paths deliberately use state/execution instead. */
  snapshot(conversationId: string): ConversationSnapshot | null {
    const head = this.head(conversationId);
    if (!head) return null;
    return { schemaVersion: 1, ...head,
      runs: this.database.prepare("SELECT json FROM conversation_runs WHERE conversation_id = ? ORDER BY position").all(conversationId).map((row) => readJsonRow(row, runSchema)),
      items: this.database.prepare("SELECT json FROM conversation_items WHERE conversation_id = ? ORDER BY position").all(conversationId).map((row) => readJsonRow(row, timelineItemSchema)),
      requests: this.database.prepare("SELECT json FROM conversation_requests WHERE conversation_id = ? ORDER BY position").all(conversationId).map((row) => readJsonRow(row, requestSchema)) };
  }
  snapshots(): ConversationSnapshot[] {
    return this.ids("SELECT id FROM conversation_heads ORDER BY rowid").flatMap((id) => {
      const snapshot = this.snapshot(id); return snapshot ? [snapshot] : [];
    });
  }
  private head(id: string) {
    const row = this.database.prepare("SELECT cursor, json FROM conversation_heads WHERE id = ?").get(id);
    if (!row) return null;
    const head = headSchema.parse(row);
    return { cursor: head.cursor, conversation: conversationSchema.parse(JSON.parse(head.json)) };
  }
  private ids(sql: string): string[] { return this.database.prepare(sql).all().map((row) => idRowSchema.parse(row).id); }

  state(conversationId: string, runId?: string): ConversationState | null {
    const head = this.head(conversationId);
    if (!head) return null;
    const runs = this.database.prepare(`SELECT json FROM conversation_runs
      WHERE conversation_id = ? AND (state IN (${activeSql}, 'queued') OR id = ?) ORDER BY position`)
      .all(conversationId, runId ?? null).map((row) => readJsonRow(row, runSchema));
    const requests = this.database.prepare(`SELECT q.json FROM conversation_requests q JOIN conversation_runs r
      ON r.conversation_id = q.conversation_id AND r.id = q.run_id
      WHERE q.conversation_id = ? AND (r.state IN (${activeSql}, 'queued') OR r.id = ?) ORDER BY q.position`)
      .all(conversationId, runId ?? null).map((row) => readJsonRow(row, requestSchema));
    return { ...head, runs, requests };
  }
  activeStates(): ConversationState[] {
    return this.ids(`SELECT h.id FROM conversation_heads h WHERE EXISTS
      (SELECT 1 FROM conversation_runs r WHERE r.conversation_id = h.id AND r.state IN (${activeSql})) ORDER BY h.rowid`)
      .flatMap((id) => { const state = this.state(id); return state ? [state] : []; });
  }
  execution(conversationId: string, runId: string): ExecutionState | null {
    const state = this.state(conversationId, runId);
    if (!state) return null;
    const items = this.database.prepare("SELECT json FROM conversation_items WHERE conversation_id = ? AND run_id = ? ORDER BY position")
      .all(conversationId, runId).map((row) => readJsonRow(row, timelineItemSchema));
    return { ...state, items };
  }
  item(conversationId: string, itemId: string) {
    const row = this.database.prepare("SELECT json FROM conversation_items WHERE conversation_id = ? AND id = ?").get(conversationId, itemId);
    return row ? readJsonRow(row, timelineItemSchema) : null;
  }
  request(conversationId: string, requestId: string) {
    const row = this.database.prepare("SELECT json FROM conversation_requests WHERE conversation_id = ? AND id = ?").get(conversationId, requestId);
    return row ? readJsonRow(row, requestSchema) : null;
  }
  writers(workspace: WorkspaceRef): string[] {
    return this.database.prepare(`SELECT h.id, h.json FROM conversation_heads h WHERE h.access = 'write'
      AND EXISTS (SELECT 1 FROM conversation_runs r WHERE r.conversation_id = h.id AND r.state IN (${activeSql}))`)
      .all().filter((row) => {
        const other = readJsonRow(row, conversationSchema).workspace;
        const options = { windows: process.platform === "win32" };
        return other.checkoutId === workspace.checkoutId || isPathWithinComparableRoot(other.path, workspace.path, options)
          || isPathWithinComparableRoot(workspace.path, other.path, options);
      }).map((row) => idRowSchema.parse(row).id);
  }
  summaries(projectId?: string): ConversationSummary[] {
    const heads = projectId === undefined
      ? this.database.prepare("SELECT id, json FROM conversation_heads ORDER BY rowid").all()
      : this.database.prepare("SELECT id, json FROM conversation_heads WHERE project_id = ? ORDER BY rowid").all(projectId);
    return heads.map((row) => {
      const id = idRowSchema.parse(row).id;
      const conversation = readJsonRow(row, conversationSchema);
      const latest = this.database.prepare(`SELECT json FROM conversation_runs WHERE conversation_id = ?
        ORDER BY CASE WHEN state IN (${activeSql}) THEN 0 WHEN state = 'queued' THEN 2 ELSE 1 END, position DESC LIMIT 1`).get(id);
      const queuedCount = this.count("SELECT count(*) AS count FROM conversation_runs WHERE conversation_id = ? AND state = 'queued'", id);
      const pendingRequestCount = this.count("SELECT count(*) AS count FROM conversation_requests WHERE conversation_id = ? AND status = 'pending'", id);
      return { ...summarizeConversation({ conversation, runs: latest ? [readJsonRow(latest, runSchema)] : [], requests: [] }), queuedCount, pendingRequestCount };
    });
  }
  private count(sql: string, id: string): number { return countRowSchema.parse(this.database.prepare(sql).get(id)).count; }

  header(conversationId: string): ConversationHeader | null {
    const state = this.state(conversationId);
    return state ? { schemaVersion: 1, cursor: state.cursor, conversation: state.conversation,
      activeRuns: state.runs.filter(isActiveRun), queuedRuns: state.runs.filter((run) => run.state === "queued"),
      pendingRequests: state.requests.filter((request) => request.status === "pending" || request.status === "responding") } : null;
  }
  history(query: HistoryQuery): ConversationHistoryPage {
    const limit = query.limit ?? 100;
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 200) throw new ExecutionCommandError("invalid", "History page size must be between 1 and 200");
    if (query.before !== undefined && (!Number.isSafeInteger(query.before) || query.before < 1)) throw new ExecutionCommandError("cursor", "History position must be a positive integer");
    const head = this.head(query.conversationId);
    if (!head) throw new ExecutionCommandError("missing", "Conversation does not exist");
    const table = query.scope === "timeline" ? "conversation_items" : "conversation_runs";
    const rows = this.database.prepare(`SELECT position, json FROM ${table} WHERE conversation_id = ? AND position < ? ORDER BY position DESC LIMIT ?`)
      .all(query.conversationId, query.before ?? Number.MAX_SAFE_INTEGER, limit + 1).map((row) => positionRowSchema.parse(row));
    const more = rows.length > limit;
    const page = rows.slice(0, limit).reverse();
    const base = { schemaVersion: 1 as const, conversationId: query.conversationId, cursor: head.cursor,
      nextBefore: more ? page[0].position : null };
    return query.scope === "timeline" ? { ...base, scope: "timeline", items: page.map((row) => readJsonRow(row, timelineItemSchema)) }
      : { ...base, scope: "runs", runs: page.map((row) => readJsonRow(row, runSchema)) };
  }
}
