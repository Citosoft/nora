import type { AppImportEnvironment } from "./appImportSource.types";

/** Lists the working directories a provider's sessions ran in, from one history store. */
export interface AgentHistoryLister {
  listPaths(env: AppImportEnvironment): Promise<string[]>;
}

export interface AgentHistorySourceOptions {
  id: "claude" | "codex";
  /** Where the provider keeps history; the source counts as found when any of them exists. */
  dataDirectories(env: AppImportEnvironment): string[];
  listers: readonly AgentHistoryLister[];
}
