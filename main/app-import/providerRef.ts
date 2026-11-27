import type { AppImportProviderRef } from "@shared/types/app-import/appImportPlan.types";

/** Source-app provider ids that mean Nora's native Claude or Codex runtimes. */
const NATIVE_ALIASES: Readonly<Record<string, AppImportProviderRef["provider"]>> = {
  claude: "claude",
  claudeAgent: "claude",
  "claude-code": "claude",
  codex: "codex"
};

export function toProviderRef(sourceProvider: string): AppImportProviderRef {
  return { provider: NATIVE_ALIASES[sourceProvider] ?? "other", sourceProvider };
}
