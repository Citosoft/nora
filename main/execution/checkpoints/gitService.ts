import type { TurnCheckpoints } from "@main/types/execution/checkpoints.types";
import type { WorkspaceAuthority } from "@main/types/execution/workspace.types";
import { createFileCapture } from "./capture";
import { compareSnapshots } from "./diff";

export function createGitCheckpoints(executable: string, authority: WorkspaceAuthority, now: () => string,
  excludedPaths: readonly string[] = []): TurnCheckpoints {
  return { capture: createFileCapture(executable, authority, now, excludedPaths),
    compare: (baseline, final) => compareSnapshots(executable, baseline, final) };
}
