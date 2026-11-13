import type { NoraSettingsOptions } from "@main/types/nora-tools/operations.types";
import type { ProjectSummary } from "@shared/appTypes";
import type { ExecutionHost } from "@main/execution/host";
import type { PersonalizationService } from "@main/personalization/service";
import type { NoraTaskStore } from "@main/types/nora-tools/operations.types";
import type { BotMemoryStore } from "@main/types/bots/memory.types";
import type { WorkspaceCatalog } from "@main/types/personalization/services.types";

export interface NativeRuntimeOptions extends NoraSettingsOptions {
  stateDirectory: string;
  personalDirectory: string;
  projects(): readonly ProjectSummary[];
  activateWorkspace(path: string): Promise<void>;
  chooseFolder(): Promise<{ path: string; name: string } | null>;
  openFolder(path: string): Promise<void>;
  /** Task boards for Nora's tools, backed by the workspace service. */
  tasks?: NoraTaskStore;
}
export interface NativeRuntime {
  host: ExecutionHost;
  personalization: PersonalizationService;
  catalog: WorkspaceCatalog;
  memory: BotMemoryStore;
  /** Stops the host and Nora's tool server. */
  shutdown(): Promise<void>;
}
