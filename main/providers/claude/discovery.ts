import { query } from "@anthropic-ai/claude-agent-sdk";
import type { SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import type { ClaudeDiscovery, ClaudeRuntimeOptions } from "@main/types/execution/claude.types";
import { normalizeClaudeAuthentication } from "./authentication";

/** Initializes SDK control methods without sending a user instruction or invoking inference. */
export function createClaudeDiscovery(runtime: ClaudeRuntimeOptions): (cwd: string) => Promise<ClaudeDiscovery> {
  return async (cwd) => {
    let release = (): void => {};
    const closed = new Promise<void>((resolve) => { release = resolve; });
    async function* idleInput(): AsyncGenerator<SDKUserMessage> { await closed; }
    const session = query({ prompt: idleInput(), options: { cwd,
      pathToClaudeCodeExecutable: runtime.executablePath, env: { ...process.env, ...runtime.environment } } });
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const [models, account] = await Promise.race([
        Promise.all([session.supportedModels(), session.accountInfo()]),
        new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error("Claude discovery timed out")), runtime.discoveryTimeoutMs ?? 10_000); })
      ]);
      return {
        models: models.map((model) => ({ id: model.value, name: model.displayName, description: model.description,
          reasoningEfforts: model.supportsEffort ? model.supportedEffortLevels ?? [] : [], defaultReasoningEffort: null })),
        // A catalog or account source does not establish entitlement to a particular model.
        authentication: normalizeClaudeAuthentication(account)
      };
    } finally { clearTimeout(timeout); release(); session.close(); await session.return(); }
  };
}
