import type { ThreadWorkspaceDeps, ThreadWorkspaceSnapshot, ThreadLayout, ThreadDocumentRuntime } from "./state.types";

export interface ThreadWorkspaceInternals {
  deps: ThreadWorkspaceDeps;
  snapshot(): ThreadWorkspaceSnapshot;
  runtime(id: string): ThreadDocumentRuntime;
  setRuntime(id: string, change: Partial<ThreadDocumentRuntime>): void;
  save(layout: ThreadLayout): boolean;
  refresh(): void;
}
