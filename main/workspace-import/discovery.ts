import { realpath, stat } from "node:fs/promises";
import path from "node:path";
import type { WorkspaceHistorySource } from "@main/types/workspace-import/discovery.types";
import type { DiscoveredWorkspace, WorkspaceDiscoveryResult } from "@shared/types/workspaceImport.types";

/** Fold sessions launched in subdirectories and symlink aliases into one checkout. */
async function resolveWorkspace(cwd: string): Promise<string | null> {
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

export async function discoverWorkspaces(sources: readonly WorkspaceHistorySource[], existingPaths: readonly string[]): Promise<WorkspaceDiscoveryResult> {
  const existing = new Set(await Promise.all(existingPaths.map(async (entry) => await realpath(entry).catch(() => entry))));
  const workspaces = new Map<string, DiscoveredWorkspace>();
  const warnings: string[] = [];
  const resolvedPaths = new Map<string, string | null>();
  const results = await Promise.allSettled(sources.map((source) => source.listPaths()));
  for (const [index, result] of results.entries()) {
    const source = sources[index];
    if (result.status === "rejected") {
      warnings.push(`Could not read ${source.id === "claude" ? "Claude" : "Codex"} project history. Retry to check again.`);
      continue;
    }
    for (const cwd of new Set(result.value)) {
      if (!resolvedPaths.has(cwd)) resolvedPaths.set(cwd, await resolveWorkspace(cwd));
      const root = resolvedPaths.get(cwd);
      if (!root || existing.has(root)) continue;
      const workspace = workspaces.get(root) ?? { path: root, name: path.basename(root) || root, sources: [] };
      if (!workspace.sources.includes(source.id)) workspace.sources.push(source.id);
      workspaces.set(root, workspace);
    }
  }
  return { workspaces: [...workspaces.values()].sort((a, b) => a.name.localeCompare(b.name) || a.path.localeCompare(b.path)), warnings };
}
