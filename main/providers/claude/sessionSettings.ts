import type { ClaudeFlagSettings, ClaudeOpenInput } from "@main/types/execution/claude.types";

/**
 * Flag-level settings apply to this session only, so they leave the user's own Claude Code setup untouched. claude.ai
 * connectors are left out separately (see claudeAccountConnectorOptions) so the ones a bot was given can still connect.
 */
const WITHOUT_ACCOUNT_EXTRAS: ClaudeFlagSettings = { syncClaudeAiPlugins: false, syncClaudeAiSkills: false };

/** One session's flag-level settings: tool-output budget, auto-compaction and, for threads that skip them, the account's synced plugins and skills. */
export function claudeSessionSettings(input: Pick<ClaudeOpenInput, "model" | "autoCompactTokens" | "accountExtras">,
  output: ClaudeFlagSettings | undefined): ClaudeFlagSettings | undefined {
  const settings: ClaudeFlagSettings = {
    ...output,
    ...(input.autoCompactTokens ? { autoCompactEnabled: true, autoCompactWindow: input.autoCompactTokens,
      modelSettings: { [input.model]: { autoCompactWindow: input.autoCompactTokens } } } : {}),
    ...(input.accountExtras ? {} : WITHOUT_ACCOUNT_EXTRAS)
  };
  return Object.keys(settings).length ? settings : undefined;
}
