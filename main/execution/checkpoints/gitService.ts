import type { TurnCheckpoints } from "@main/types/execution/checkpoints.types";
import type { WorkspaceAuthority } from "@main/types/execution/workspace.types";
import { createFileCapture } from "./capture";
import { compareSnapshots } from "./diff";
import { readCheckpointEntry } from "./gitObjects";
import { createFileRestore } from "./restore";

export function createGitCheckpoints(executable: string, authority: WorkspaceAuthority, now: () => string,
  excludedPaths: readonly string[] = []): TurnCheckpoints {
  return { capture: createFileCapture(executable, authority, now, excludedPaths),
    compare: (workspace, baseline, final) => compareSnapshots(executable, workspace.path, baseline, final),
    read: (workspace, entry) => readCheckpointEntry(executable, workspace.path, entry),
    restore: createFileRestore(authority) };
}
