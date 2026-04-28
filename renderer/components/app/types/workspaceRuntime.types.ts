import type { WorkspaceFileTreeState } from "@/components/app/types";
import type { AppState, ChangeEntry } from "@shared/appTypes";

export type WorkspaceRuntimeValue = {
  safely: (action: () => Promise<AppState>) => Promise<AppState | null>;
  captureError: (error: unknown) => void;
  normalizeSnapshot: (next: AppState) => AppState;
  workspaceFileTree: WorkspaceFileTreeState;
  fileChangeCounts: Record<string, Pick<ChangeEntry, "additions" | "deletions">>;
};
