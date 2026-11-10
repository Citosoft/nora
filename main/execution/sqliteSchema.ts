import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { runSchema, snapshotSchema } from "@shared/conversations/contracts";
import { projectSqliteEvent } from "./sqliteProjection";

const versionRowSchema = z.object({ user_version: z.number().int() });
const legacyRowSchema = z.object({ json: z.string() });

/** Migrations and ownership verification commit together; malformed old state remains untouched. */
export function migrateExecutionSchema(database: DatabaseSync, environmentId: string): void {
  database.exec("BEGIN IMMEDIATE");
  try {
    const version = versionRowSchema.parse(database.prepare("PRAGMA user_version").get()).user_version;
    if (version > 6) throw new Error(`Unsupported execution schema ${version}; a newer Nora version is required`);
    if (version === 0) {
      database.exec(`
        CREATE TABLE execution_owner (environment_id TEXT NOT NULL);
        CREATE TABLE conversations (id TEXT PRIMARY KEY, json TEXT NOT NULL);
        CREATE TABLE receipts (id TEXT PRIMARY KEY, json TEXT NOT NULL);
        CREATE TABLE effects (id TEXT PRIMARY KEY, json TEXT NOT NULL);
        CREATE TABLE events (cursor INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE,
          conversation_id TEXT NOT NULL, json TEXT NOT NULL);
        CREATE INDEX events_conversation_cursor ON events(conversation_id, cursor);
      `);
      database.prepare("INSERT INTO execution_owner VALUES (?)").run(environmentId);
    }
    const owner = z.object({ environment_id: z.literal(environmentId) }).safeParse(
      database.prepare("SELECT environment_id FROM execution_owner").get());
    if (!owner.success) throw new Error("Execution database belongs to a different environment");
    if (version < 2) {
      database.exec(`CREATE TABLE execution_lease (singleton INTEGER PRIMARY KEY CHECK(singleton = 1),
        owner_id TEXT NOT NULL, process_id INTEGER NOT NULL);`);
    }
    if (version < 3) normalizeProjections(database, environmentId);
    if (version < 4) prepareHistoricalReviews(database);
    if (version < 5) database.exec(`CREATE TABLE IF NOT EXISTS checkpoint_blobs (hash TEXT PRIMARY KEY, content BLOB NOT NULL);
      CREATE TABLE IF NOT EXISTS turn_checkpoints (
      conversation_id TEXT NOT NULL REFERENCES conversation_heads(id), run_id TEXT NOT NULL,
      baseline_ready INTEGER NOT NULL, json TEXT NOT NULL, PRIMARY KEY(conversation_id, run_id))`);
    // Historical conversations retain their original native guidance; never infer a new role.
    if (version < 6) database.exec("UPDATE conversation_heads SET json = json_set(json, '$.role', NULL) WHERE json_type(json, '$.role') IS NULL");
    database.exec("PRAGMA user_version = 6; COMMIT");
  } catch (error) { database.exec("ROLLBACK"); throw error; }
}

/** v4 introduces host review effects/items; older readers must refuse the newer schema. */
function prepareHistoricalReviews(database: DatabaseSync): void {
  for (const row of database.prepare(`SELECT json FROM conversation_runs
    WHERE state IN ('completed', 'failed', 'interrupted') AND json_extract(json, '$.review') = 'pending'`).iterate()) {
    const run = runSchema.parse(JSON.parse(legacyRowSchema.parse(row).json));
    const effect = { id: JSON.stringify([run.attemptId, "review"]), conversationId: run.conversationId,
      runId: run.id, attemptId: run.attemptId, status: "pending", action: { kind: "review" } };
    // Ownership recovery marks historical reviews unavailable rather than capturing today's files.
    database.prepare("INSERT INTO effects VALUES (?, ?) ON CONFLICT(id) DO NOTHING").run(effect.id, JSON.stringify(effect));
  }
}

function normalizeProjections(database: DatabaseSync, environmentId: string): void {
  database.exec(`
    CREATE TABLE conversation_heads (id TEXT PRIMARY KEY, cursor INTEGER NOT NULL,
      project_id TEXT NOT NULL, checkout_id TEXT NOT NULL, access TEXT NOT NULL, json TEXT NOT NULL);
    CREATE INDEX heads_project ON conversation_heads(project_id);
    CREATE INDEX heads_checkout ON conversation_heads(checkout_id, access);
    CREATE TABLE conversation_runs (position INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT NOT NULL REFERENCES conversation_heads(id), id TEXT NOT NULL,
      state TEXT NOT NULL, json TEXT NOT NULL, UNIQUE(conversation_id, id));
    CREATE INDEX runs_state ON conversation_runs(state, conversation_id);
    CREATE INDEX runs_history ON conversation_runs(conversation_id, position);
    CREATE TABLE conversation_items (position INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT NOT NULL REFERENCES conversation_heads(id), id TEXT NOT NULL,
      run_id TEXT NOT NULL, json TEXT NOT NULL, UNIQUE(conversation_id, id));
    CREATE INDEX items_run ON conversation_items(conversation_id, run_id);
    CREATE INDEX items_history ON conversation_items(conversation_id, position);
    CREATE TABLE conversation_requests (position INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT NOT NULL REFERENCES conversation_heads(id), id TEXT NOT NULL,
      run_id TEXT NOT NULL, status TEXT NOT NULL, json TEXT NOT NULL, UNIQUE(conversation_id, id));
    CREATE INDEX requests_run ON conversation_requests(conversation_id, run_id);
    CREATE INDEX requests_status ON conversation_requests(conversation_id, status);
    CREATE INDEX unfinished_effects ON effects(json_extract(json, '$.status'));
  `);
  // Iterate rather than loading every old transcript into memory at once.
  for (const row of database.prepare("SELECT id, json FROM conversations ORDER BY rowid").iterate()) {
    const snapshot = snapshotSchema.parse(JSON.parse(legacyRowSchema.parse(row).json));
    const identity = z.object({ id: z.literal(snapshot.conversation.id) }).safeParse(row);
    if (!identity.success || snapshot.conversation.workspace.environmentId !== environmentId) throw new Error("Legacy conversation identity does not match its owning environment");
    const base = { schemaVersion: 1 as const, cursor: snapshot.cursor, conversationId: snapshot.conversation.id,
      at: snapshot.conversation.updatedAt, id: "migration" };
    projectSqliteEvent(database, { ...base, payload: { kind: "conversation", conversation: snapshot.conversation } });
    for (const run of snapshot.runs) projectSqliteEvent(database, { ...base, payload: { kind: "run", run } });
    for (const item of snapshot.items) projectSqliteEvent(database, { ...base, payload: { kind: "item", item } });
    for (const request of snapshot.requests) projectSqliteEvent(database, { ...base, payload: { kind: "request", request } });
  }
  database.exec("DROP TABLE conversations");
}
