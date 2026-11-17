import type { RuntimeDirectoryEntry } from "@shared/types/remote-access/directory.types";
import type { LoadState } from "./loadState.types";

export interface RuntimeDirectoryView {
  runtimes: RuntimeDirectoryEntry[];
  /** `cached` when the Worker could not be reached and the last saved list is shown instead. */
  source: "live" | "cached";
  savedAt: string | null;
  liveError: string | null;
}

export interface RuntimeDirectoryApi {
  state: LoadState<RuntimeDirectoryView>;
  refresh(): Promise<void>;
  rename(installationId: string, name: string): Promise<void>;
  remove(installationId: string): Promise<void>;
  find(installationId: string): RuntimeDirectoryEntry | null;
}
