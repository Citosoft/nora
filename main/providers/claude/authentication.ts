import type { AccountInfo } from "@anthropic-ai/claude-agent-sdk";
import type { ProviderCatalog } from "@shared/types/provider/catalog.types";
import type { ProviderAccount } from "@shared/types/provider/account.types";
import type { ClaudeLogin } from "@main/types/execution/claude.types";

const isSet = (source: string | undefined): source is string => Boolean(source) && source !== "none" && source !== "unknown";

/**
 * Which credential Claude Code is using, mirroring its precedence (an API key overrides a claude.ai login).
 * Current runtimes omit `tokenSource` for a claude.ai login and report only the profile, so a profile with no
 * other credential source counts as a claude.ai login. Third-party providers authenticate externally.
 */
export function claudeLogin(account: AccountInfo): ClaudeLogin {
  if (account.apiProvider && account.apiProvider !== "firstParty") return "third-party";
  if (isSet(account.apiKeySource)) return "api-key";
  if (account.tokenSource === "claude.ai") return "claude.ai";
  if (isSet(account.tokenSource)) return "token";
  if (account.subscriptionType || account.email) return "claude.ai";
  return account.apiProvider === "firstParty" && !isSet(account.tokenSource) ? "none" : "unknown";
}

function claudePlan(subscriptionType: string | undefined): string {
  if (!subscriptionType) return "Claude account";
  return /^claude\b/i.test(subscriptionType) ? subscriptionType : `Claude ${subscriptionType.charAt(0).toUpperCase()}${subscriptionType.slice(1)}`;
}

/** Maps the SDK's account report onto a provider-neutral sign-in state. */
export function normalizeClaudeAccount(account: AccountInfo): ProviderAccount {
  const label = account.email ?? account.organization ?? null;
  switch (claudeLogin(account)) {
    case "claude.ai": return { state: "signed-in", method: claudePlan(account.subscriptionType), label };
    case "api-key": return { state: "signed-in", method: "API key", label: null };
    case "token": return { state: "signed-in", method: "Long-lived token", label };
    case "none": return { state: "signed-out" };
    case "third-party":
    case "unknown": return { state: "unknown" };
  }
}

export function normalizeClaudeAuthentication(account: AccountInfo): ProviderCatalog["authentication"] {
  const { state } = normalizeClaudeAccount(account);
  return state === "signed-in" ? "present" : state === "signed-out" ? "required" : "unknown";
}
