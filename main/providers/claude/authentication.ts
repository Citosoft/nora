import type { AccountInfo } from "@anthropic-ai/claude-agent-sdk";
import type { ProviderCatalog } from "@shared/types/provider/catalog.types";

export function normalizeClaudeAuthentication(account: AccountInfo): ProviderCatalog["authentication"] {
  const sources = [account.tokenSource, account.apiKeySource];
  if (sources.some((source) => source && source !== "none" && source !== "unknown")) return "present";
  if (account.apiProvider === "firstParty" && sources.every((source) => source === "none")) return "required";
  return "unknown";
}
