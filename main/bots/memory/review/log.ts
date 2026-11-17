import { DatabaseSync } from "node:sqlite";
import { memoryReviewRecordSchema } from "@shared/bots/memoryReviewActivity";
import type { MemoryReviewRecord } from "@shared/types/bots/memoryReview.types";
import type { MemoryReviewLog } from "@main/types/bots/memoryReview.types";

/** Records older than this are pruned when a new one is written. */
const RETENTION_DAYS = 90;
const DAY_MS = 86_400_000;

const rowToRecord = (row: Record<string, unknown>): MemoryReviewRecord => memoryReviewRecordSchema.parse({
  id: row.id, conversationId: row.conversation_id, threadTitle: row.thread_title, ownerName: row.owner_name, at: row.at,
  durationMs: row.duration_ms, provider: row.provider, model: row.model ?? null, status: row.status,
  outcome: row.outcome === null ? null : JSON.parse(String(row.outcome)),
  usage: row.input_tokens === null ? null : { inputTokens: row.input_tokens, outputTokens: row.output_tokens }, error: row.error ?? null
});

export function openMemoryReviewLog(path: string, deps: { nextId(): string; now(): Date }): MemoryReviewLog {
  const database = new DatabaseSync(path);
  database.exec(`PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS memory_reviews (id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL, thread_title TEXT NOT NULL, owner_name TEXT NOT NULL,
      at TEXT NOT NULL, duration_ms INTEGER NOT NULL, provider TEXT NOT NULL, model TEXT, status TEXT NOT NULL, outcome TEXT,
      input_tokens INTEGER, output_tokens INTEGER, error TEXT);
    CREATE INDEX IF NOT EXISTS memory_reviews_at ON memory_reviews (at);`);
  return {
    record(entry) {
      const record = memoryReviewRecordSchema.parse({ ...entry, id: deps.nextId(), threadTitle: entry.threadTitle.slice(0, 200),
        error: entry.error?.slice(0, 500) ?? null });
      database.prepare("INSERT INTO memory_reviews VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(record.id, record.conversationId, record.threadTitle,
        record.ownerName, record.at, record.durationMs, record.provider, record.model, record.status, record.outcome ? JSON.stringify(record.outcome) : null,
        record.usage?.inputTokens ?? null, record.usage?.outputTokens ?? null, record.error);
      database.prepare("DELETE FROM memory_reviews WHERE at < ?").run(new Date(deps.now().getTime() - RETENTION_DAYS * DAY_MS).toISOString());
    },
    activity(since, limit) {
      const totals = database.prepare(`SELECT COUNT(*) AS reviews, COALESCE(SUM(status = 'failed'), 0) AS failed,
        COALESCE(SUM(input_tokens), 0) AS input_tokens, COALESCE(SUM(output_tokens), 0) AS output_tokens,
        COALESCE(SUM(input_tokens IS NULL), 0) AS unmetered FROM memory_reviews WHERE at >= ?`).get(since) as Record<string, number>;
      const recent = database.prepare("SELECT * FROM memory_reviews ORDER BY at DESC, rowid DESC LIMIT ?").all(limit).map(rowToRecord);
      return { since, recent, totals: { reviews: totals.reviews, failed: totals.failed, inputTokens: totals.input_tokens,
        outputTokens: totals.output_tokens, unmetered: totals.unmetered } };
    },
    close() { database.close(); }
  };
}
