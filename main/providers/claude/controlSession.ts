import { query } from "@anthropic-ai/claude-agent-sdk";
import type { Query, SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import type { ClaudeRuntimeOptions } from "@main/types/execution/claude.types";

/** Read runtime control APIs without sending a prompt or invoking inference. */
export async function withClaudeControlSession<T>(runtime: ClaudeRuntimeOptions, cwd: string, read: (session: Query) => Promise<T>, model?: string): Promise<T> {
  let release = (): void => {};
  const closed = new Promise<void>((resolve) => { release = resolve; });
  async function* idleInput(): AsyncGenerator<SDKUserMessage> { await closed; }
  const session = query({ prompt: idleInput(), options: { cwd, ...(model ? { model } : {}),
    pathToClaudeCodeExecutable: runtime.executablePath, env: { ...process.env, ...runtime.environment } } });
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([read(session), new Promise<never>((_, reject) => {
      timeout = setTimeout(() => reject(new Error("Claude discovery timed out")), runtime.discoveryTimeoutMs ?? 10_000);
    })]);
  } finally { clearTimeout(timeout); release(); session.close(); await session.return(); }
}
