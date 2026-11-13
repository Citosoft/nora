import { DatabaseSync } from "node:sqlite";
import { botMemoryEntrySchema } from "@shared/bots/contracts";
import type { BotMemoryEntry } from "@shared/types/bots/bots.types";
import type { BotMemoryStore } from "@main/types/bots/memory.types";

const MAX_NOTES_PER_BOT = 500;
const rowToEntry = (row: Record<string, unknown>): BotMemoryEntry => botMemoryEntrySchema.parse({
  id: row.id, botId: row.bot_id, workspaceId: row.workspace_id ?? null, text: row.text,
  source: JSON.parse(String(row.source)), createdAt: row.created_at, updatedAt: row.updated_at
});

export function openBotMemoryStore(path: string, deps: { now(): string; nextId(): string }): BotMemoryStore {
  const database = new DatabaseSync(path);
  database.exec(`PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS bot_memories (id TEXT PRIMARY KEY, bot_id TEXT NOT NULL, workspace_id TEXT, text TEXT NOT NULL,
      source TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS bot_memories_bot ON bot_memories (bot_id, updated_at);`);
  const applicable = "bot_id = ? AND (? IS NULL OR workspace_id IS NULL OR workspace_id = ?)";
  const select = (where: string, ...values: (string | null)[]): BotMemoryEntry[] =>
    database.prepare(`SELECT * FROM bot_memories WHERE ${where} ORDER BY updated_at DESC, rowid DESC`).all(...values).map(rowToEntry);
  const get = (id: string): BotMemoryEntry => {
    const [entry] = select("id = ?", id);
    if (!entry) throw new Error("That note no longer exists.");
    return entry;
  };
  return {
    list: (botId, workspaceId) => select(applicable, botId, workspaceId, workspaceId),
    add(input) {
      const count = database.prepare("SELECT COUNT(*) AS count FROM bot_memories WHERE bot_id = ?").get(input.botId) as { count: number };
      if (count.count >= MAX_NOTES_PER_BOT) throw new Error(`This bot already has ${MAX_NOTES_PER_BOT} notes. Remove some in Settings → Bots first.`);
      const at = deps.now();
      const entry = botMemoryEntrySchema.parse({ id: deps.nextId(), ...input, createdAt: at, updatedAt: at });
      database.prepare("INSERT INTO bot_memories VALUES (?, ?, ?, ?, ?, ?, ?)")
        .run(entry.id, entry.botId, entry.workspaceId, entry.text, JSON.stringify(entry.source), entry.createdAt, entry.updatedAt);
      return entry;
    },
    update(id, text) {
      const next = botMemoryEntrySchema.parse({ ...get(id), text, updatedAt: deps.now() });
      database.prepare("UPDATE bot_memories SET text = ?, updated_at = ? WHERE id = ?").run(next.text, next.updatedAt, id);
      return next;
    },
    remove(id) { database.prepare("DELETE FROM bot_memories WHERE id = ?").run(id); },
    search(botId, workspaceId, query, limit) {
      const terms = query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
      const notes = select(applicable, botId, workspaceId, workspaceId);
      if (!terms.length) return notes.slice(0, limit);
      return notes.map((note) => ({ note, score: terms.filter((term) => note.text.toLocaleLowerCase().includes(term)).length }))
        .filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score).slice(0, limit).map((entry) => entry.note);
    },
    digest(botId, workspaceId, maxChars) {
      const lines: string[] = [];
      let used = 0;
      for (const note of select(applicable, botId, workspaceId, workspaceId)) {
        const line = `- ${note.text}`;
        if (used + line.length > maxChars) break;
        lines.push(line); used += line.length + 1;
      }
      return lines.length ? lines.join("\n") : null;
    },
    close() { database.close(); }
  };
}
