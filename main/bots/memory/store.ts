import { DatabaseSync } from "node:sqlite";
import { botMemoryEntrySchema } from "@shared/bots/contracts";
import type { BotMemoryEntry } from "@shared/types/bots/bots.types";
import type { BotMemoryStore } from "@main/types/bots/memory.types";
import { noteLine } from "./format";

const MAX_NOTES_PER_BOT = 500;
const rowToEntry = (row: Record<string, unknown>): BotMemoryEntry => botMemoryEntrySchema.parse({
  id: row.id, botId: row.bot_id, workspaceId: row.workspace_id ?? null, text: row.text,
  source: JSON.parse(String(row.source)), createdAt: row.created_at, updatedAt: row.updated_at
});

/** The search index follows the notes table through triggers; porter stemming lets "release" find "Releases". */
const SEARCH_SCHEMA = `CREATE VIRTUAL TABLE bot_memory_search USING fts5(text, content='bot_memories', content_rowid='rowid', tokenize='porter unicode61');
  CREATE TRIGGER IF NOT EXISTS bot_memory_search_insert AFTER INSERT ON bot_memories BEGIN
    INSERT INTO bot_memory_search(rowid, text) VALUES (new.rowid, new.text); END;
  CREATE TRIGGER IF NOT EXISTS bot_memory_search_update AFTER UPDATE OF text ON bot_memories BEGIN
    INSERT INTO bot_memory_search(bot_memory_search, rowid, text) VALUES ('delete', old.rowid, old.text);
    INSERT INTO bot_memory_search(rowid, text) VALUES (new.rowid, new.text); END;
  CREATE TRIGGER IF NOT EXISTS bot_memory_search_delete AFTER DELETE ON bot_memories BEGIN
    INSERT INTO bot_memory_search(bot_memory_search, rowid, text) VALUES ('delete', old.rowid, old.text); END;`;

/** Each word of a free-text query as a quoted prefix term, any of which may match; null when the query has no words. */
function searchExpression(query: string): string | null {
  const words = query.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  return words.length ? [...new Set(words)].map((word) => `"${word}"*`).join(" OR ") : null;
}

export function openBotMemoryStore(path: string, deps: { now(): string; nextId(): string }): BotMemoryStore {
  const database = new DatabaseSync(path);
  database.exec(`PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS bot_memories (id TEXT PRIMARY KEY, bot_id TEXT NOT NULL, workspace_id TEXT, text TEXT NOT NULL,
      source TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS bot_memories_bot ON bot_memories (bot_id, updated_at);
    CREATE TABLE IF NOT EXISTS bot_memory_reviews (conversation_id TEXT PRIMARY KEY, reviewed_through TEXT NOT NULL);`);
  // Stores from before search existed get the index built once from their notes.
  if (!database.prepare("SELECT 1 FROM sqlite_master WHERE name = 'bot_memory_search'").get()) {
    database.exec(SEARCH_SCHEMA);
    database.exec("INSERT INTO bot_memory_search(bot_memory_search) VALUES ('rebuild')");
  }
  const applicable = "bot_id = ? AND (? IS NULL OR workspace_id IS NULL OR workspace_id = ?)";
  const select = (where: string, ...values: (string | null)[]): BotMemoryEntry[] =>
    database.prepare(`SELECT * FROM bot_memories WHERE ${where} ORDER BY updated_at DESC, rowid DESC`).all(...values).map(rowToEntry);
  const get = (id: string): BotMemoryEntry | null => select("id = ?", id)[0] ?? null;
  const existing = (id: string): BotMemoryEntry => {
    const entry = get(id);
    if (!entry) throw new Error("That note no longer exists.");
    return entry;
  };
  return {
    list: (botId, workspaceId) => select(applicable, botId, workspaceId, workspaceId),
    get,
    add(input) {
      // Saving the same note twice keeps the first, so repeated saves never crowd out other notes.
      const [duplicate] = select("bot_id = ? AND workspace_id IS ? AND text = ?", input.botId, input.workspaceId, input.text.trim());
      if (duplicate) return duplicate;
      const count = database.prepare("SELECT COUNT(*) AS count FROM bot_memories WHERE bot_id = ?").get(input.botId) as { count: number };
      if (count.count >= MAX_NOTES_PER_BOT) throw new Error(`This bot already has ${MAX_NOTES_PER_BOT} notes. Merge or forget some first.`);
      const at = deps.now();
      const entry = botMemoryEntrySchema.parse({ id: deps.nextId(), ...input, createdAt: at, updatedAt: at });
      database.prepare("INSERT INTO bot_memories VALUES (?, ?, ?, ?, ?, ?, ?)")
        .run(entry.id, entry.botId, entry.workspaceId, entry.text, JSON.stringify(entry.source), entry.createdAt, entry.updatedAt);
      return entry;
    },
    update(id, text) {
      const next = botMemoryEntrySchema.parse({ ...existing(id), text, updatedAt: deps.now() });
      database.prepare("UPDATE bot_memories SET text = ?, updated_at = ? WHERE id = ?").run(next.text, next.updatedAt, id);
      return next;
    },
    remove(id) { database.prepare("DELETE FROM bot_memories WHERE id = ?").run(id); },
    search(botId, workspaceId, query, limit) {
      const expression = searchExpression(query);
      if (!expression) return select(applicable, botId, workspaceId, workspaceId).slice(0, limit);
      return database.prepare(`SELECT m.* FROM bot_memory_search JOIN bot_memories m ON m.rowid = bot_memory_search.rowid
        WHERE bot_memory_search MATCH ? AND m.bot_id = ? AND (? IS NULL OR m.workspace_id IS NULL OR m.workspace_id = ?)
        ORDER BY bm25(bot_memory_search), m.updated_at DESC LIMIT ?`).all(expression, botId, workspaceId, workspaceId, limit).map(rowToEntry);
    },
    digest(botId, workspaceId, maxChars) {
      const notes = select(applicable, botId, workspaceId, workspaceId);
      const kept: BotMemoryEntry[] = [];
      let used = 0;
      for (const note of notes) {
        const size = noteLine(note).length + 1;
        if (used + size > maxChars) break;
        kept.push(note); used += size;
      }
      return kept.length ? { notes: kept, omitted: notes.length - kept.length } : null;
    },
    reviewedThrough(conversationId) {
      const row = database.prepare("SELECT reviewed_through FROM bot_memory_reviews WHERE conversation_id = ?").get(conversationId) as { reviewed_through: string } | undefined;
      return row?.reviewed_through ?? null;
    },
    markReviewed(conversationId, through) {
      database.prepare(`INSERT INTO bot_memory_reviews VALUES (?, ?)
        ON CONFLICT(conversation_id) DO UPDATE SET reviewed_through = excluded.reviewed_through`).run(conversationId, through);
    },
    close() { database.close(); }
  };
}
