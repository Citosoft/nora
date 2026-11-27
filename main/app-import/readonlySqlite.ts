import { DatabaseSync } from "node:sqlite";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";

/**
 * Opens another app's SQLite database without writing to it or leaving files beside it.
 *
 * While the app runs (its -wal and -shm exist), `mode=ro` joins the WAL like any reader, so rows
 * not yet checkpointed are visible. Otherwise `immutable=1` reads the main file alone: `mode=ro`
 * would create fresh -wal/-shm files in the app's directory, and with no WAL there is nothing
 * immutable could miss.
 */
export function openReadonlySqlite(path: string): DatabaseSync {
  const live = existsSync(`${path}-wal`) && existsSync(`${path}-shm`);
  const url = pathToFileURL(path);
  url.searchParams.set(live ? "mode" : "immutable", live ? "ro" : "1");
  const database = new DatabaseSync(url, { readOnly: true });
  try {
    database.exec("PRAGMA query_only = 1");
    // Force the schema read now so a broken open fails here rather than mid-import.
    database.prepare("SELECT count(*) FROM sqlite_master").get();
    return database;
  } catch (error) {
    database.close();
    throw error;
  }
}

export function withReadonlySqlite<T>(path: string, read: (database: DatabaseSync) => T): T {
  const database = openReadonlySqlite(path);
  try {
    return read(database);
  } finally {
    database.close();
  }
}

export function sqliteTableNames(database: DatabaseSync): ReadonlySet<string> {
  const rows = database.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all();
  return new Set(rows.flatMap((row) => typeof row.name === "string" ? [row.name] : []));
}

export function sqliteUserVersion(database: DatabaseSync): number | null {
  const value = database.prepare("PRAGMA user_version").get()?.user_version;
  return typeof value === "number" ? value : null;
}

/**
 * Select list for `columns`, substituting `NULL AS <column>` for ones an older schema lacks, so
 * one query reads every layout. Column names are trusted constants from the caller.
 */
export function sqliteSelectList(database: DatabaseSync, table: string, columns: readonly string[], alias?: string): string {
  const present = new Set(database.prepare(`PRAGMA table_info(${JSON.stringify(table)})`).all().map((row) => row.name));
  const prefix = alias ? `${alias}.` : "";
  return columns.map((column) => present.has(column) ? `${prefix}${column}` : `NULL AS ${column}`).join(", ");
}
