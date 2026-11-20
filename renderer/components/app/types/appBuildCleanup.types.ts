import type { ThreadWorkspaceStore } from "./thread-workspace/state.types";

export type AppBuildCleanupStore = Pick<ThreadWorkspaceStore, "client" | "setSettled" | "refresh">;
