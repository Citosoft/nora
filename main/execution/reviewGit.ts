import type { WorkspaceReviewer } from "@main/types/execution/review.types";
import type { WorkspaceAuthority } from "@main/types/execution/workspace.types";
import { workspaceReviewSchema } from "@shared/conversations/review";
import { isNotGitRepository, runWorkspaceGit } from "./gitProcess";

/** NUL framing preserves unusual filenames and both sides of a rename/copy. */
export function parseChangedPaths(output: string): string[] {
  if (output && !output.endsWith("\0")) throw new Error("Truncated Git status");
  const records = output ? output.slice(0, -1).split("\0") : [];
  const paths = new Set<string>();
  for (let index = 0; index < records.length; index++) {
    const record = records[index];
    if (!/^[ MADRCU?!]{2} .+$/s.test(record)) throw new Error("Invalid Git status");
    paths.add(record.slice(3));
    if (/[RC]/.test(record.slice(0, 2))) {
      const source = records[++index];
      if (!source) throw new Error("Missing rename source");
      paths.add(source);
    }
  }
  return [...paths].sort();
}

export function createGitReviewer(executable: string, authority: WorkspaceAuthority): WorkspaceReviewer {
  return async (workspace) => {
    await authority.verify(workspace);
    try {
      const { stdout } = await runWorkspaceGit(executable, workspace.path,
        ["status", "--porcelain=v1", "-z", "--untracked-files=all", "--ignore-submodules=none"]);
      await authority.verify(workspace);
      // This is current workspace scope, including pre-existing/untracked changes, never a turn diff.
      return workspaceReviewSchema.parse({ status: "ready", scope: "workspace", paths: parseChangedPaths(stdout) });
    } catch (error) {
      if (isNotGitRepository(error)) return { status: "unavailable", reason: "unsupported" };
      throw error;
    }
  };
}
