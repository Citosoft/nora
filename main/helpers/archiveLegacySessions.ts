import { mkdir, open } from "node:fs/promises";
import { join } from "node:path";
import { getProjectDir } from "@main/noraPaths";
import { isNodeError } from "@main/nodeErrors";
import type { PersistedSessionState } from "@main/types/internal.types";

/** Preserve legacy session metadata before the workspace starts persisting terminal-only state. */
export async function archiveLegacySessions(projectId: string, sessions: readonly PersistedSessionState[]): Promise<void> {
  const legacy = sessions.filter((entry) => entry.agents.length);
  if (!legacy.length) return;
  const directory = join(getProjectDir(projectId), "legacy-sessions");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  for (const session of legacy) {
    try {
      const file = await open(join(directory, `${encodeURIComponent(session.session.id)}.json`), "wx", 0o600);
      try { await file.writeFile(JSON.stringify({ version: 1, session })); await file.sync(); }
      finally { await file.close(); }
    } catch (error) { if (!isNodeError(error) || error.code !== "EEXIST") throw error; }
  }
}
