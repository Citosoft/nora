import { DatabaseSync } from "node:sqlite";
import { mkdirSync, openSync, closeSync, chmodSync } from "node:fs";
import path from "node:path";
import { remoteAuditEntrySchema } from "@shared/remote-access/gateway";
import type { RemoteAuditEntry } from "@shared/types/remote-access/remoteAccess.types";

/** Only typed action metadata is accepted: never store instructions, tool arguments or tokens here. */
export function openRemoteAuditLog(file: string) {
  mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  closeSync(openSync(file, "a", 0o600));
  chmodSync(file, 0o600);
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS remote_audit (id INTEGER PRIMARY KEY, entry TEXT NOT NULL)");
  return {
    record(entry: RemoteAuditEntry): void {
      const value = remoteAuditEntrySchema.parse(entry);
      db.prepare("INSERT INTO remote_audit (entry) VALUES (?)").run(JSON.stringify(value));
      db.exec("DELETE FROM remote_audit WHERE id NOT IN (SELECT id FROM remote_audit ORDER BY id DESC LIMIT 1000)");
    },
    async activity(limit: number): Promise<RemoteAuditEntry[]> {
      return db.prepare("SELECT entry FROM remote_audit ORDER BY id DESC LIMIT ?").all(Math.min(200, Math.max(1, Math.trunc(limit)))).map((row) => {
        if (typeof row.entry !== "string") throw new Error("Remote activity could not be read.");
        const input: unknown = JSON.parse(row.entry);
        return remoteAuditEntrySchema.parse(input);
      });
    },
    close() { db.close(); }
  };
}
