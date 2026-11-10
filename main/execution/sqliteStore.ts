import { DatabaseSync } from "node:sqlite";
import { chmodSync, closeSync, openSync } from "node:fs";
import { z } from "zod";
import { commandReceiptSchema, conversationEventSchema } from "@shared/conversations/contracts";
import type { ConversationEvent, EventPayload } from "@shared/types/conversation/contracts.types";
import type { ExecutionEffect, ExecutionStore, StoredReceipt, StoreTransaction } from "@main/types/execution/store.types";
import { effectSchema } from "./effectSchema";
import { SqliteQueries } from "./sqliteQueries";
import { migrateExecutionSchema } from "./sqliteSchema";
import { projectSqliteEvent } from "./sqliteProjection";
import type { ExecutionOwner, OwnershipStore } from "@main/types/execution/ownership.types";
import type { StoredCheckpoint } from "@main/types/execution/checkpoints.types";
import { saveCheckpoint } from "./checkpoints/storage";

const storedReceiptSchema = z.object({ key: z.string(), fingerprint: z.string(), receipt: commandReceiptSchema }).strict();
const cursorRowSchema = z.object({ cursor: z.number().int().nonnegative() });
const jsonRowSchema = z.object({ json: z.string() });

/** One owner per environment. All mutation is synchronous and serialized in BEGIN IMMEDIATE. */
export class SqliteExecutionStore extends SqliteQueries implements ExecutionStore, StoreTransaction, OwnershipStore {
  private inTransaction = false;
  private closed = false;

  constructor(path: string, readonly environmentId: string) {
    if (path !== ":memory:") {
      const descriptor = openSync(path, "a", 0o600);
      closeSync(descriptor);
      chmodSync(path, 0o600);
    }
    super(new DatabaseSync(path, { enableForeignKeyConstraints: true }));
    try {
      this.database.exec("PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL;");
      migrateExecutionSchema(this.database, environmentId);
    } catch (error) {
      this.database.close();
      throw error;
    }
  }

  transaction<T>(work: (transaction: StoreTransaction) => T): T {
    if (this.inTransaction) throw new Error("Execution transactions cannot nest");
    this.database.exec("BEGIN IMMEDIATE");
    this.inTransaction = true;
    try {
      const result = work(this);
      if (result instanceof Promise) throw new Error("Execution transactions must not perform asynchronous work");
      this.database.exec("COMMIT");
      return result;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    } finally {
      this.inTransaction = false;
    }
  }

  private requireTransaction(): void {
    if (!this.inTransaction) throw new Error("Execution writes require a transaction");
  }

  ownership(): ExecutionOwner | null {
    const row = this.database.prepare("SELECT owner_id AS id, process_id AS processId FROM execution_lease WHERE singleton = 1").get();
    return row ? z.object({ id: z.string(), processId: z.number().int().positive() }).parse(row) : null;
  }
  claimOwnership(owner: ExecutionOwner, expectedOwnerId: string | null): boolean {
    return this.transaction(() => {
      const current = this.ownership();
      if ((current?.id ?? null) !== expectedOwnerId) return false;
      this.database.prepare("INSERT INTO execution_lease VALUES (1, ?, ?) ON CONFLICT(singleton) DO UPDATE SET owner_id = excluded.owner_id, process_id = excluded.process_id")
        .run(owner.id, owner.processId);
      return true;
    });
  }
  releaseOwnership(ownerId: string): boolean {
    return this.transaction(() => this.database.prepare("DELETE FROM execution_lease WHERE singleton = 1 AND owner_id = ?").run(ownerId).changes === 1);
  }

  receipt(id: string): StoredReceipt | null {
    const row = this.database.prepare("SELECT json FROM receipts WHERE id = ?").get(id);
    return row ? storedReceiptSchema.parse(JSON.parse(jsonRowSchema.parse(row).json)) : null;
  }
  effect(id: string): ExecutionEffect | null {
    const row = this.database.prepare("SELECT json FROM effects WHERE id = ?").get(id);
    return row ? effectSchema.parse(JSON.parse(jsonRowSchema.parse(row).json)) : null;
  }
  effects(): ExecutionEffect[] {
    return this.database.prepare("SELECT json FROM effects ORDER BY rowid").all()
      .map((row) => effectSchema.parse(JSON.parse(jsonRowSchema.parse(row).json)));
  }
  unfinishedEffects(): ExecutionEffect[] {
    return this.database.prepare("SELECT json FROM effects WHERE json_extract(json, '$.status') IN ('pending', 'claimed') ORDER BY rowid").all()
      .map((row) => effectSchema.parse(JSON.parse(jsonRowSchema.parse(row).json)));
  }
  cursor(): number {
    return cursorRowSchema.parse(this.database.prepare("SELECT coalesce(max(cursor), 0) AS cursor FROM events").get()).cursor;
  }
  events(after: number, limit: number, conversationId?: string): ConversationEvent[] {
    const rows = conversationId
      ? this.database.prepare("SELECT json FROM events WHERE cursor > ? AND conversation_id = ? ORDER BY cursor LIMIT ?").all(after, conversationId, limit)
      : this.database.prepare("SELECT json FROM events WHERE cursor > ? ORDER BY cursor LIMIT ?").all(after, limit);
    return rows.map((row) => conversationEventSchema.parse(JSON.parse(jsonRowSchema.parse(row).json)));
  }
  project(event: ConversationEvent): void {
    this.requireTransaction();
    projectSqliteEvent(this.database, event);
  }
  putReceipt(stored: StoredReceipt): void {
    this.requireTransaction();
    this.database.prepare("INSERT INTO receipts VALUES (?, ?)").run(stored.key, JSON.stringify(storedReceiptSchema.parse(stored)));
  }
  putEffect(effect: ExecutionEffect): void {
    this.requireTransaction();
    this.database.prepare("INSERT INTO effects VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET json = excluded.json")
      .run(effect.id, JSON.stringify(effectSchema.parse(effect)));
  }
  putCheckpoint(checkpoint: StoredCheckpoint): void {
    this.requireTransaction();
    saveCheckpoint(this.database, checkpoint);
  }
  appendEvent(id: string, conversationId: string, at: string, payload: EventPayload): ConversationEvent {
    this.requireTransaction();
    const result = this.database.prepare("INSERT INTO events(id, conversation_id, json) VALUES (?, ?, '{}')").run(id, conversationId);
    const event = conversationEventSchema.parse({ schemaVersion: 1, cursor: Number(result.lastInsertRowid), id, conversationId, at, payload });
    this.database.prepare("UPDATE events SET json = ? WHERE cursor = ?").run(JSON.stringify(event), event.cursor);
    return event;
  }
  close(): void { if (!this.closed) { this.database.close(); this.closed = true; } }
}
