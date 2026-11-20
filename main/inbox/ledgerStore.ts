import fs from "node:fs";
import path from "node:path";
import { inboxLedgerSchema } from "@shared/inbox/contracts";
import { isNodeError } from "@main/nodeErrors";
import type { InboxLedger } from "@shared/types/inbox/inbox.types";
import type { InboxLedgerStore } from "@main/types/inbox/inbox.types";

/**
 * The user's read, done and snooze marks, in one small JSON file in Nora's state directory. A file that cannot be parsed is
 * set aside rather than overwritten, so marks are never silently lost, and the inbox starts afresh.
 */
export function createInboxLedgerStore(directory: string): InboxLedgerStore {
  const file = path.join(directory, "inbox.json");
  return {
    read() {
      let text: string;
      try { text = fs.readFileSync(file, "utf8"); }
      catch (error) { if (isNodeError(error) && error.code === "ENOENT") return null; throw error; }
      const parsed = inboxLedgerSchema.safeParse(safeJson(text));
      if (parsed.success) return parsed.data;
      fs.renameSync(file, `${file}.corrupt-${Date.now()}`);
      return null;
    },
    write(ledger: InboxLedger) {
      const temporary = `${file}.${process.pid}.tmp`;
      fs.mkdirSync(directory, { recursive: true });
      fs.writeFileSync(temporary, JSON.stringify(inboxLedgerSchema.parse(ledger)), "utf8");
      fs.renameSync(temporary, file);
    }
  };
}

function safeJson(text: string): unknown {
  try { return JSON.parse(text); } catch { return null; }
}
