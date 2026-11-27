import path from "node:path";
import { pathExists } from "@main/app-import/fileSystem";
import { withReadonlySqlite, sqliteTableNames } from "@main/app-import/readonlySqlite";
import type { AppImportSkippedItem } from "@shared/types/app-import/appImportPlan.types";
import type { OrcaSkippedStores, OrcaStateDomains } from "@main/types/app-import/orca.types";

function entryCount(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  return typeof value === "object" && value !== null ? Object.keys(value).length : 0;
}

/** Orca native chat sessions live in their own journal database, which this importer does not read yet. */
function countChatSessions(databasePath: string): number {
  return withReadonlySqlite(databasePath, (database) => {
    if (!sqliteTableNames(database).has("agent_session_records")) return 0;
    const count = database.prepare("SELECT count(*) AS count FROM agent_session_records").get()?.count;
    return typeof count === "number" ? count : 0;
  });
}

/** Items Orca holds that are deliberately left behind; only counted, never read into the plan. */
export async function listOrcaSkippedStores(userData: string, domains: OrcaStateDomains): Promise<OrcaSkippedStores> {
  const skipped: AppImportSkippedItem[] = [];
  const warnings: string[] = [];
  const sshTargets = entryCount(domains.get("sshTargets"));
  if (sshTargets > 0) skipped.push({ kind: "sshTarget", label: `${sshTargets} SSH targets`, reason: "SSH hosts and their credentials are never imported." });
  const hostSessions = entryCount(domains.get("workspaceSessionsByHostId"));
  if (hostSessions > 0) skipped.push({ kind: "remoteWorkspace", label: `Sessions on ${hostSessions} remote hosts`, reason: "Only local sessions are imported." });
  const chatDatabase = path.join(userData, "agent-session-domain.db");
  if (await pathExists(chatDatabase)) {
    try {
      const chats = countChatSessions(chatDatabase);
      if (chats > 0) skipped.push({ kind: "unsupported", label: `${chats} Orca chat sessions`, reason: "Orca's built-in chat history is not supported yet." });
    } catch {
      warnings.push("Could not check Orca chat sessions.");
    }
  }
  return { skipped, warnings };
}
