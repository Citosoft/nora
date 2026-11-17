import type { AppState } from "@shared/appTypes";
import { listChangesCheckoutPaths } from "@shared/changesCheckout";
import { normalizeComparablePath } from "@shared/pathComparison";
import type { ConversationSummary } from "@shared/types/conversation/queries.types";
import type { ChangesCheckoutOption } from "@/components/app/types/changesCheckout.types";

type ChangesCheckoutSnapshot = Pick<AppState, "project" | "worktrees" | "changesRoot">;

/** The checkout the Changes panel is showing: the selected one, or the project checkout. */
export function getChangesCheckoutPath(snapshot: ChangesCheckoutSnapshot): string | null {
  return snapshot.changesRoot || snapshot.project?.rootPath || null;
}

/** The branch checked out where the Changes panel is looking. */
export function getChangesCheckoutBranch(snapshot: ChangesCheckoutSnapshot): string {
  const path = getChangesCheckoutPath(snapshot);
  const worktree = path && path !== snapshot.project?.rootPath ? snapshot.worktrees.find((entry) => entry.path === path) : null;
  return worktree?.branch || snapshot.project?.baseBranch || "";
}

/**
 * Every checkout the Changes panel can switch to, each listing the open (unarchived) threads that work in it, so the
 * panel can show any thread's changes without being tied to the focused thread.
 */
export function buildChangesCheckoutOptions(
  snapshot: ChangesCheckoutSnapshot,
  summaries: readonly ConversationSummary[]
): ChangesCheckoutOption[] {
  const project = snapshot.project;
  if (!project) return [];
  const windows = project.platform === "win32";
  const comparable = (path: string): string => normalizeComparablePath(path, { windows });
  return listChangesCheckoutPaths(snapshot).map((path) => {
    const isProject = path === project.rootPath;
    const key = comparable(path);
    return {
      path,
      kind: isProject ? "project" : "worktree",
      branch: isProject ? project.baseBranch || "" : snapshot.worktrees.find((worktree) => worktree.path === path)?.branch || "",
      threads: summaries
        .filter(({ conversation }) => !conversation.archivedAt && comparable(conversation.workspace.path) === key)
        .map(({ conversation }) => ({ id: conversation.id, title: conversation.title }))
    };
  });
}
