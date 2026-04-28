import type { AppState } from "@shared/appTypes";

/**
 * Phase-D placeholders: today these are `AppState`; narrow to `Pick<AppState, …>` per region when safe.
 * Keeps port surfaces explicit about snapshot scope without a big-bang `AppState` refactor.
 */
export type SnapshotForSessionCenterPorts = AppState;
export type SnapshotForChangesColumnPorts = AppState;
export type SnapshotForModalClusterPorts = AppState;
