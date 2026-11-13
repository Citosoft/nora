import type { NoraRunContextResolver } from "@main/types/nora-tools/noraTools.types";
import type { ThreadPreferences } from "@shared/types/personalization/threads.types";

export interface ProviderFactoryDependencies {
  now(): string;
  preferences?: () => ThreadPreferences;
  toolOutputDirectory: string;
  /** Nora's per-run additions for conversations: its tool server and run guidance. */
  runContext?: NoraRunContextResolver;
}
