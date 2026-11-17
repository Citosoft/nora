import type { AppState } from "@shared/appTypes";
import { listChangesCheckoutPaths } from "@shared/changesCheckout";

/*
 * The Changes panel shows one checkout the user picked. The choice is never inferred from focused agents, terminals or
 * sessions, so background work such as a workflow run cannot move the panel away from what the user is looking at.
 */

/** The selected checkout while it still exists; otherwise the project root. */
export function getActiveChangesRoot(state: AppState): string {
  const selected = state.changesRoot;
  if (selected && listChangesCheckoutPaths(state).includes(selected)) return selected;
  return state.project?.rootPath || process.cwd();
}

/** Points the Changes panel at `path`, dropping commit and file selections that belonged to the previous checkout. */
export function selectChangesCheckout(state: AppState, path: string): AppState {
  if (!listChangesCheckoutPaths(state).includes(path)) {
    throw new Error("Choose the project checkout or one of its ready worktrees.");
  }
  if (state.changesRoot === path) return state;
  return { ...state, changesRoot: path, selectedChangePath: null, selectedCommitHash: null, selectedCommit: null };
}
