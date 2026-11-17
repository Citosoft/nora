import { withClaudeControlSession } from "./controlSession";
import type { ClaudeDiscovery, ClaudeRuntimeOptions } from "@main/types/execution/claude.types";
import { normalizeClaudeAuthentication } from "./authentication";

/** Initializes SDK control methods without sending a user instruction or invoking inference. */
export function createClaudeDiscovery(runtime: ClaudeRuntimeOptions): (cwd: string) => Promise<ClaudeDiscovery> {
  return async (cwd) => {
    return withClaudeControlSession(runtime, cwd, async (session) => {
      const [models, account] = await Promise.all([session.supportedModels(), session.accountInfo()]);
      return {
        models: models.map((model) => ({ id: model.value, name: model.displayName, description: model.description,
          reasoningEfforts: model.supportsEffort ? model.supportedEffortLevels ?? [] : [], defaultReasoningEffort: null })),
        // A catalog or account source does not establish entitlement to a particular model.
        authentication: normalizeClaudeAuthentication(account)
      };
    });
  };
}
