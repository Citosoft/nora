import fs from "node:fs";
import { DatabaseSync, type SQLInputValue, type SQLOutputValue } from "node:sqlite";

/**
 * Reads rows from another app's SQLite store (Cursor, Codex) in-process via Node's built-in `node:sqlite`,
 * so lookups work on every OS without a `sqlite3` binary. Opens read-only and returns null on any failure
 * (missing file, locked or unfamiliar schema) because callers treat these stores as optional hints.
 */
export const queryReadOnlySqlite = (
  databasePath: string,
  sql: string,
  params: SQLInputValue[] = []
): Record<string, SQLOutputValue>[] | null => {
  if (!fs.existsSync(databasePath)) {
    return null;
  }
  let database: DatabaseSync | null = null;
  try {
    database = new DatabaseSync(databasePath, { readOnly: true });
    return database.prepare(sql).all(...params);
  } catch {
    return null;
  } finally {
    database?.close();
  }
};
