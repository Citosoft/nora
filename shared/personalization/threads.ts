import type { Personalization } from "@shared/types/personalization/roles.types";
import type { ThreadPreferences } from "@shared/types/personalization/threads.types";

export const DEFAULT_THREAD_PREFERENCES: Readonly<ThreadPreferences> = {
  toolOutputBudget: "compact",
  subagentModel: null, followUp: "queue", automaticTitles: true, automaticMemory: true, settleAfterDays: null, claudeAutoCompactTokens: null
};

export function threadPreferences(settings: Personalization): ThreadPreferences {
  const saved = settings.threads;
  return {
    toolOutputBudget: saved?.toolOutputBudget ?? DEFAULT_THREAD_PREFERENCES.toolOutputBudget,
    subagentModel: saved?.subagentModel ?? DEFAULT_THREAD_PREFERENCES.subagentModel,
    followUp: saved?.followUp ?? DEFAULT_THREAD_PREFERENCES.followUp,
    automaticTitles: saved?.automaticTitles ?? DEFAULT_THREAD_PREFERENCES.automaticTitles,
    automaticMemory: saved?.automaticMemory ?? DEFAULT_THREAD_PREFERENCES.automaticMemory,
    settleAfterDays: saved?.settleAfterDays ?? DEFAULT_THREAD_PREFERENCES.settleAfterDays,
    claudeAutoCompactTokens: saved?.claudeAutoCompactTokens ?? DEFAULT_THREAD_PREFERENCES.claudeAutoCompactTokens
  };
}
