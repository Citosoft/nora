import { realpath, stat } from "node:fs/promises";
import path from "node:path";
import { appImportKey } from "@main/app-import/importKey";
import { appImportSourceDisplayName } from "@shared/app-import/sources";
import type { AppImportWorkspace } from "@shared/types/app-import/appImportPlan.types";
import type { AgentHistoryLister } from "@main/types/app-import/agentHistory.types";
import type { AppImportEnvironment } from "@main/types/app-import/appImportSource.types";

/** Folds sessions launched in subdirectories and symlink aliases into the checkout they belong to. */
export async function resolveProjectRoot(cwd: string): Promise<string | null> {
  if (!path.isAbsolute(cwd)) return null;
  try {
    const resolved = await realpath(cwd);
    if (!(await stat(resolved)).isDirectory()) return null;
    for (let directory = resolved; ; directory = path.dirname(directory)) {
      if (await stat(path.join(directory, ".git")).then(() => true, () => false)) return directory;
      if (path.dirname(directory) === directory) return resolved;
    }
  } catch { return null; } // Deleted sessions and unavailable volumes are not import candidates.
}

/** One workspace per project folder any of the provider's history stores mentions; a failing store only adds a warning. */
export async function historyWorkspaces(id: "claude" | "codex", listers: readonly AgentHistoryLister[], env: AppImportEnvironment): Promise<{ workspaces: AppImportWorkspace[]; warnings: string[] }> {
  const roots = new Set<string>();
  const warnings: string[] = [];
  const resolved = new Map<string, string | null>();
  for (const result of await Promise.allSettled(listers.map(async (lister) => await lister.listPaths(env)))) {
    if (result.status === "rejected") {
      warnings.push(`Could not read ${appImportSourceDisplayName(id)} project history. Look again to retry.`);
      continue;
    }
    for (const cwd of new Set(result.value)) {
      if (!resolved.has(cwd)) resolved.set(cwd, await resolveProjectRoot(cwd));
      const root = resolved.get(cwd);
      if (root) roots.add(root);
    }
  }
  const workspaces = [...roots].map((root): AppImportWorkspace => ({ importKey: appImportKey(id, "workspace", root), name: path.basename(root) || root, path: root, pathExists: true, pinned: false, archived: false }));
  workspaces.sort((left, right) => left.name.localeCompare(right.name) || left.path.localeCompare(right.path));
  return { workspaces, warnings };
}
