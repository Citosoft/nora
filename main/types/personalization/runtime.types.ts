import type { NativeProvider } from "@shared/ipc/types/personalizationGateway.types";
import type { SharedBotLibrary } from "@main/types/bots/sharedBots.types";

export interface PersonalizationServiceOptions {
  cursor(): number;
  environmentId: string;
  providers: readonly NativeProvider[];
  /** Re-discovers installed runtimes, registering new ones with the execution host, and returns the current list. */
  refreshProviders?(): Promise<readonly NativeProvider[]>;
  chooseFolder(): Promise<{ path: string; name: string } | null>;
  openFolder(path: string): Promise<void>;
  activateWorkspace?(path: string): Promise<void>;
  resolveProject?(id: string): { path: string; name: string } | null;
  /** Shared workspace bot files; absent where bots are not supported. */
  bots?: SharedBotLibrary;
  /** Whether Nora's own tool server is running; absent means it is not available here. */
  noraToolsRunning?(): boolean;
}
