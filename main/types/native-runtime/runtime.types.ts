import type { AppSettings, ProjectSummary } from "@shared/appTypes";
import type { ExecutionHost } from "@main/execution/host";
import type { PersonalizationService } from "@main/personalization/service";
import type { WorkspaceCatalog } from "@main/types/personalization/services.types";

export interface NativeRuntimeOptions {
  stateDirectory: string;
  personalDirectory: string;
  readSettings(): AppSettings;
  saveSettings(settings: AppSettings): Promise<AppSettings>;
  projects(): readonly ProjectSummary[];
  activateWorkspace(path: string): Promise<void>;
  chooseFolder(): Promise<{ path: string; name: string } | null>;
  openFolder(path: string): Promise<void>;
}
export interface NativeRuntime {
  host: ExecutionHost;
  personalization: PersonalizationService;
  catalog: WorkspaceCatalog;
}
