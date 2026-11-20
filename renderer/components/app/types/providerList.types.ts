import type { AgentCatalogEntry } from "@shared/appTypes";
import type { ProviderLoginMethod } from "@shared/types/provider/account.types";
import type { ProviderAccountView } from "./providerAccount.types";

export type ProvidersTab = "installed" | "available";

export interface ProviderListRowProps {
  tool: Pick<AgentCatalogEntry, "id" | "label" | "enabled">;
  accountView: ProviderAccountView | undefined;
  loginMethods: readonly ProviderLoginMethod[];
  /** True while Nora rediscovers runtimes, so a row without a runtime shows progress instead of a problem. */
  connecting: boolean;
  onToggle(enabled: boolean): void;
  onSignIn(methodId?: string): void;
}

export interface ProviderInstallRowProps {
  tool: Pick<AgentCatalogEntry, "id" | "label" | "description" | "installStatus">;
  onInstall(): void;
}
