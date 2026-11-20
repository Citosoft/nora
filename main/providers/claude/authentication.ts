import type { AccountInfo } from "@anthropic-ai/claude-agent-sdk";
import type { ProviderCatalog } from "@shared/types/provider/catalog.types";
import type { ProviderAccount, ProviderConnectionKind } from "@shared/types/provider/account.types";
import type { ClaudeLogin } from "@main/types/execution/claude.types";

const isSet = (source: string | undefined): source is string => Boolean(source) && source !== "none" && source !== "unknown";
/** The key `claude auth login --console` provisions for an Anthropic Console account. */
const CONSOLE_KEY_SOURCE = "/login managed key";

/**
 * Which credential Claude Code is using, mirroring its precedence (an API key, including the one an Anthropic
 * Console login provisions, overrides a claude.ai login).
 * Current runtimes omit `tokenSource` for a claude.ai login and report only the profile, so a profile with no
 * other credential source counts as a claude.ai login. Third-party providers authenticate externally.
 */
export function claudeLogin(account: AccountInfo): ClaudeLogin {
  if (account.apiProvider && account.apiProvider !== "firstParty") return "third-party";
  if (account.apiKeySource === CONSOLE_KEY_SOURCE) return "console";
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
    case "console": return { state: "signed-in", method: "Anthropic Console", label };
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

/** Credential precedence determines billing; a model name or account email does not. */
export function normalizeClaudeConnection(account: AccountInfo): ProviderConnectionKind {
  switch (claudeLogin(account)) {
    case "claude.ai": return "subscription";
    case "console": case "api-key": case "third-party": return "api";
    case "token": return account.subscriptionType ? "subscription" : "unknown";
    case "none": case "unknown": return "unknown";
  }
}
