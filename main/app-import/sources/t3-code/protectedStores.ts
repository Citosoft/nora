import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { pathExists } from "@main/app-import/fileSystem";
import type { AppImportSkippedItem } from "@shared/types/app-import/appImportPlan.types";

/** Stores holding credentials, sign-in or device trust. Only their existence is checked; contents are never read. */
const PROTECTED_DIRECTORIES: ReadonlyArray<{ name: string; item: AppImportSkippedItem }> = [
  { name: "secrets", item: { kind: "secret", label: "T3 Code secret store", reason: "Secrets are never imported." } },
  { name: "clerk", item: { kind: "account", label: "T3 Code sign-in", reason: "Accounts and sign-in sessions are never imported." } }
];
const PROTECTED_TABLES: ReadonlyArray<{ table: string; item: AppImportSkippedItem }> = [
  { table: "auth_sessions", item: { kind: "account", label: "Signed-in devices", reason: "Sign-in sessions are never imported." } },
  { table: "auth_pairing_links", item: { kind: "account", label: "Device pairing links", reason: "Pairing links are never imported." } },
  { table: "peer_environment_links", item: { kind: "account", label: "Linked environments", reason: "Remote environment links are never imported." } },
  { table: "scheduled_tasks", item: { kind: "unsupported", label: "Scheduled tasks", reason: "Scheduled tasks and their webhook tokens are not imported." } }
];

function hasRows(database: DatabaseSync, table: string): boolean {
  // Table names come from the constant list above.
  return database.prepare(`SELECT EXISTS (SELECT 1 FROM ${table}) AS present`).get()?.present === 1;
}

export async function listT3CodeProtectedStores(stateDir: string, database: DatabaseSync, tables: ReadonlySet<string>): Promise<AppImportSkippedItem[]> {
  const skipped: AppImportSkippedItem[] = [];
  for (const { name, item } of PROTECTED_DIRECTORIES) if (await pathExists(path.join(stateDir, name))) skipped.push(item);
  for (const { table, item } of PROTECTED_TABLES) if (tables.has(table) && hasRows(database, table)) skipped.push(item);
  return skipped;
}
