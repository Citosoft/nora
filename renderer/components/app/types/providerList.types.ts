import type { AgentCatalogEntry } from "@shared/appTypes";
import type { ProviderAccountView } from "./providerAccount.types";

export type ProvidersTab = "installed" | "available";

export interface ProviderListRowProps {
  tool: Pick<AgentCatalogEntry, "id" | "label" | "enabled">;
  accountView: ProviderAccountView | undefined;
  /** True while Nora rediscovers runtimes, so a row without a runtime shows progress instead of a problem. */
  connecting: boolean;
  onToggle(enabled: boolean): void;
  onSignIn(): void;
}

export interface ProviderInstallRowProps {
  tool: Pick<AgentCatalogEntry, "id" | "label" | "description" | "installStatus">;
  onInstall(): void;
}
