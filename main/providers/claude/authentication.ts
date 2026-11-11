import type { AccountInfo } from "@anthropic-ai/claude-agent-sdk";
import type { ProviderCatalog } from "@shared/types/provider/catalog.types";
import type { ProviderAccount } from "@shared/types/provider/account.types";

const isSet = (source: string | undefined): source is string => Boolean(source) && source !== "none" && source !== "unknown";
const titleCase = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

/**
 * Maps the SDK's account report onto a provider-neutral sign-in state. Third-party providers authenticate
 * externally (cloud credentials), so their state cannot be confirmed from the report and stays unknown.
 */
export function normalizeClaudeAccount(account: AccountInfo): ProviderAccount {
  const label = account.email ?? account.organization ?? null;
  if (account.tokenSource === "claude.ai") {
    return { state: "signed-in", method: account.subscriptionType ? `Claude ${titleCase(account.subscriptionType)}` : "Claude account", label };
  }
  if (isSet(account.apiKeySource)) return { state: "signed-in", method: "API key", label };
  if (isSet(account.tokenSource)) return { state: "signed-in", method: "Long-lived token", label };
  if (account.apiProvider === "firstParty" && account.tokenSource === "none" && account.apiKeySource === "none") return { state: "signed-out" };
  return { state: "unknown" };
}

export function normalizeClaudeAuthentication(account: AccountInfo): ProviderCatalog["authentication"] {
  const { state } = normalizeClaudeAccount(account);
  return state === "signed-in" ? "present" : state === "signed-out" ? "required" : "unknown";
}
