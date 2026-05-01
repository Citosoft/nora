import type { AgentUsageWorktreeInput } from "@shared/types/agentUsageStats.types";
import { isPathWithinComparableRoot, normalizeComparablePath } from "@shared/pathComparison";
import path from "node:path";
import { realpath } from "node:fs/promises";

export type CanonicalWorktree = AgentUsageWorktreeInput & { canonicalPath: string };

export async function buildCanonicalWorktrees(worktrees: AgentUsageWorktreeInput[]): Promise<CanonicalWorktree[]> {
  const resolved = await Promise.all(
    worktrees.map(async (worktree) => {
      try {
        const canonicalPath = await realpath(worktree.path);
        return { ...worktree, canonicalPath };
      } catch {
        return { ...worktree, canonicalPath: path.resolve(worktree.path) };
      }
    })
  );
  return resolved.sort((left, right) => right.canonicalPath.length - left.canonicalPath.length);
}

function defaultLabelForPath(cwd: string): string {
  const parts = cwd.replace(/\\/g, "/").split("/").filter(Boolean);
  if (parts.length >= 2) {
    return parts.slice(-2).join("/");
  }
  return parts.at(-1) ?? cwd;
}

export async function resolveWorktreeForProjectCwd(
  cwd: string | null,
  canonicalWorktrees: CanonicalWorktree[]
): Promise<{ worktreeId: string | null; projectLabel: string; projectKey: string }> {
  if (!cwd || !cwd.trim()) {
    return { worktreeId: null, projectLabel: "Unknown location", projectKey: "unscoped" };
  }

  const windows = process.platform === "win32";
  const options = { windows };

  let canonicalCwd: string;
  try {
    canonicalCwd = await realpath(cwd);
  } catch {
    canonicalCwd = path.resolve(cwd);
  }

  const normalizedCwd = normalizeComparablePath(canonicalCwd, options);

  for (const worktree of canonicalWorktrees) {
    const normalizedWt = normalizeComparablePath(worktree.canonicalPath, options);
    if (normalizedCwd === normalizedWt) {
      return {
        worktreeId: worktree.worktreeId,
        projectLabel: worktree.displayName,
        projectKey: `worktree:${worktree.worktreeId}`
      };
    }
  }

  for (const worktree of canonicalWorktrees) {
    const normalizedWt = normalizeComparablePath(worktree.canonicalPath, options);
    if (isPathWithinComparableRoot(normalizedCwd, normalizedWt, options)) {
      return {
        worktreeId: worktree.worktreeId,
        projectLabel: worktree.displayName,
        projectKey: `worktree:${worktree.worktreeId}`
      };
    }
  }

  return {
    worktreeId: null,
    projectLabel: defaultLabelForPath(cwd),
    projectKey: `cwd:${normalizedCwd}`
  };
}
