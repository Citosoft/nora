import { query } from "@anthropic-ai/claude-agent-sdk";
import type { Query, SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import type { ClaudeControlSessionOpener, ClaudeControlSessionRunner, ClaudeSharedControlSession } from "@main/types/execution/claude.types";

/**
 * A cold Claude Code start takes several seconds before any control read can answer, more while the app is starting;
 * the limit only exists to give up on a hung runtime.
 */
export const CLAUDE_DISCOVERY_TIMEOUT_MS = 20_000;

const openSdkControlSession: ClaudeControlSessionOpener<Query> = (runtime, cwd, model) => {
  let release = (): void => {};
  const closed = new Promise<void>((resolve) => { release = resolve; });
  async function* idleInput(): AsyncGenerator<SDKUserMessage> { await closed; }
  const session = query({ prompt: idleInput(), options: { cwd, ...(model ? { model } : {}),
    pathToClaudeCodeExecutable: runtime.executablePath, env: { ...process.env, ...runtime.environment } } });
  return { session, close: async () => { release(); session.close(); await session.return(); } };
};

/**
 * Opening a thread asks for its models, skills, MCP servers and context together. Reads that overlap for the same
 * runtime, checkout and model share one spawned session, so a cold start is paid once instead of racing several
 * runtimes against the timeout. The session closes when its last reader finishes.
 */
export function createClaudeControlSessions<Session>(open: ClaudeControlSessionOpener<Session>): ClaudeControlSessionRunner<Session> {
  const shared = new Map<string, ClaudeSharedControlSession<Session>>();
  return async (runtime, cwd, read, model) => {
    const key = JSON.stringify([runtime.executablePath, runtime.environment ?? null, cwd, model ?? null]);
    let entry = shared.get(key);
    if (!entry) {
      entry = { ...open(runtime, cwd, model), readers: 0 };
      shared.set(key, entry);
    }
    const current = entry;
    current.readers++;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([read(current.session), new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error("Claude discovery timed out")), runtime.discoveryTimeoutMs ?? CLAUDE_DISCOVERY_TIMEOUT_MS);
      })]);
    } catch (error) {
      // A failed or hung runtime is never handed to later readers; current readers still finish on it.
      if (shared.get(key) === current) shared.delete(key);
      throw error;
    } finally {
      clearTimeout(timeout);
      if (--current.readers === 0) {
        if (shared.get(key) === current) shared.delete(key);
        await current.close();
      }
    }
  };
}

/** Read runtime control APIs without sending a prompt or invoking inference. */
export const withClaudeControlSession = createClaudeControlSessions(openSdkControlSession);
